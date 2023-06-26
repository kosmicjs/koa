import {AsyncLocalStorage} from 'node:async_hooks';
import {Buffer} from 'node:buffer';
import Emitter from 'node:events';
import util from 'node:util';
import Stream from 'node:stream';
import http, {type IncomingMessage, type ServerResponse} from 'node:http';
import process from 'node:process';
import statuses from 'statuses';
import compose, {type ComposedMiddleware} from 'koa-compose';
import onFinished from 'on-finished';
import {HttpError} from 'http-errors';
import _debug from 'debug';

import KoaRequest from './request';
import KoaContext from './context';
import KoaResponse from './response';

/**
 * Module dependencies.
 */

const debug = _debug('koa:application');

export type Middleware = (
  ctx: KoaContext,
  next: () => Promise<any>,
) => Promise<any>;

export default class Application extends Emitter {
  proxy: boolean;
  subdomainOffset: number;
  proxyIpHeader: string;
  maxIpsCount: string | number;
  env: string;
  compose: typeof compose;
  context: KoaContext;
  request?: KoaRequest;
  response?: KoaResponse;
  keys?: string[];
  middleware: Middleware[];
  silent?: boolean;
  ctxStorage?: AsyncLocalStorage<KoaContext>;
  [util.inspect.custom]?: () => {
    subdomainOffset: number;
    proxy: boolean;
    env: string;
  };

  constructor(options: {
    env?: string;
    keys?: string[];
    proxy?: boolean;
    subdomainOffset?: number;
    proxyIpHeader?: string;
    maxIpsCount?: number;
    compose?: typeof compose;
    asyncLocalStorage?: boolean;
  }) {
    super();
    options = options || {};
    this.proxy = options.proxy ?? false;
    this.subdomainOffset = options.subdomainOffset ?? 2;
    this.proxyIpHeader = options.proxyIpHeader ?? 'X-Forwarded-For';
    this.maxIpsCount = options.maxIpsCount ?? 0;
    this.env = options.env ?? process.env.NODE_ENV ?? 'development';
    this.compose = options.compose ?? compose;
    if (options.keys) this.keys = options.keys;

    this.middleware = [];

    this.context = {};
    this.request = {};
    this.response = {};

    // util.inspect.custom support for node 6+
    /* istanbul ignore else */
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }

    if (options.asyncLocalStorage) {
      this.ctxStorage = new AsyncLocalStorage();
      this.use(this.createAsyncCtxStorageMiddleware());
    }
  }

  listen(...args: Parameters<http.Server['listen']>) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  toJSON() {
    return {
      subdomainOffset: this.subdomainOffset,
      proxy: this.proxy,
      env: this.env,
    };
  }

  inspect() {
    return this.toJSON();
  }

  use(fn: Middleware) {
    if (typeof fn !== 'function')
      throw new TypeError('middleware must be a function!');
    debug('use %s', fn.name || '-');
    this.middleware.push(fn);
    return this;
  }

  callback() {
    const fn = this.compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
      const ctx: KoaContext = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  /**
   * return current context from async local storage
   */
  // eslint-disable-next-line getter-return
  get currentContext() {
    if (this.ctxStorage) return this.ctxStorage.getStore();
  }

  /**
   * Handle request in callback.
   *
   * @api private
   */

  async handleRequest(
    ctx: KoaContext,
    fnMiddleware: ComposedMiddleware<KoaContext>,
  ) {
    const res = ctx.res;
    res.statusCode = 404;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const onerror = (err: (Error & HttpError) | null, msg: string) => {
      ctx.onerror(err);
    };

    const handleResponse = () => respond(ctx);

    // @ts-expect-error aslkfjlaksfjsk
    if (onerror) onFinished(res, onerror);

    // @ts-expect-error aslkfjlaksfjsk
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */

  createContext(req: IncomingMessage, res: ServerResponse) {
    const context = new KoaContext({
      ...this.context,
      _app: this,
      _req: req,
      _res: res,
    });

    const request = new KoaRequest({
      _app: this,
      _req: req,
      _res: res,
    });
    const response = new KoaResponse({
      _app: this,
      _req: req,
      _res: res,
    });
    request.ctx = context;
    response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl;
    context.state = {};
    return context;
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */

  onerror(err: Error & {status?: number; expose?: boolean}) {
    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      Object.prototype.toString.call(err) === '[object Error]' ||
      err instanceof Error;
    if (!isNativeError)
      throw new TypeError(util.format('non-error thrown: %j', err));

    if (err.status === 404 || err.expose) return;
    if (this.silent) return;

    const msg = err.stack ?? err.toString();
    console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
  }

  /**
   * Help TS users comply to CommonJS, ESM, bundler mismatch.
   * @see https://github.com/koajs/koa/issues/1513
   */

  static get default() {
    return Application;
  }

  createAsyncCtxStorageMiddleware() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    const app = this;
    return async function (ctx: KoaContext, next: () => Promise<any>) {
      await app.ctxStorage?.run(ctx, async () => {
        await next();
      });
    };
  }
}

/**
 * Response helper.
 */

function respond(ctx: KoaContext) {
  // allow bypassing koa
  if (ctx.respond === false) return;

  if (!ctx.writable) return;

  const res = ctx.res;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (code && statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if (ctx.method === 'HEAD') {
    if (!res.headersSent && !ctx.response.has('Content-Length')) {
      const {length} = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }

    return res.end();
  }

  // status body
  // eslint-disable-next-line no-eq-null, eqeqeq
  if (body == null) {
    if (ctx.response._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      ctx.length = 0;
      return res.end();
    }

    // @typescript-eslint/no-unsafe-assignment
    body =
      ctx.req?.httpVersionMajor && ctx.req?.httpVersionMajor >= 2
        ? String(code)
        : ctx.message ?? String(code);

    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }

    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if (typeof body === 'string') return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }

  res.end(body);
}

/**
 * Make HttpError available to consumers of the library so that consumers don't
 * have a direct dependency upon `http-errors`
 */
module.exports = Application;
module.exports.HttpError = HttpError;
