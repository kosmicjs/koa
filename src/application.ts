/* eslint-disable @typescript-eslint/member-ordering */
import {AsyncLocalStorage} from 'node:async_hooks';
import {Buffer} from 'node:buffer';
import Emitter from 'node:events';
import util from 'node:util';
import assert from 'node:assert';
import Stream from 'node:stream';
import http, {type IncomingMessage, type ServerResponse} from 'node:http';
import process from 'node:process';
import {type UnknownRecord} from 'type-fest';
import statuses from 'statuses';
import onFinished from 'on-finished';
import {HttpError} from 'http-errors';
import _debug from 'debug';
import {type Context} from './context.types.js';
import compose, {type Middleware} from './compose.js';
import only from './node-only.js';
import koaRequest from './request.js';
import {type KoaRequest} from './request.types.js';
import koaContext from './context.js';
import koaResponse from './response.js';
import {type KoaResponse} from './response.types.js';

/**
 * Module dependencies.
 */

const debug = _debug('koa:application');

export type Options = {
  env?: string;
  keys?: string[];
  proxy?: boolean;
  subdomainOffset?: number;
  proxyIpHeader?: string;
  maxIpsCount?: number;
  compose?: typeof compose;
  asyncLocalStorage?: boolean;
};

class App extends Emitter {
  /**
   * Make HttpError available to consumers of the library so that consumers don't
   * have a direct dependency upon `http-errors`
   */
  static HttpError = HttpError;
  /**
   * app.proxy
   *
   * when true proxy header fields will be trusted
   */
  proxy: boolean;
  /**
   * app.subdomainOffset
   *
   * offset of .subdomains to ignore, default to 2
   */
  subdomainOffset: number;
  /**
   * app.proxyIpHeader
   *
   * proxy ip header, default to X-Forwarded-For
   */
  proxyIpHeader: string;
  /**
   * app.maxIpsCount
   * max ips read from proxy ip header, default to 0 (means infinity)
   */
  maxIpsCount: number;
  /**
   * app.env
   * Defaults to NODE_ENV or "development"
   */
  env: string;
  compose: typeof compose;
  /**
   * The extendable koa context prototype object.
   */
  context: Context;
  /**
   * The koa request object.
   */
  request: KoaRequest;
  /**
   * The incoming node request object.
   */
  req?: IncomingMessage;
  /**
   * The node response object.
   */
  res?: ServerResponse;
  /**
   * The koa response object.
   */
  response: KoaResponse;
  /**
   * @prop app.keys
   * array of signed cookie keys
   */
  keys?: string[];
  /**
   * middleware
   * @private
   */
  private readonly middleware: Middleware[];
  /**
   * @name app.silent
   * By default outputs all errors to stderr unless app.silent is true.
   */
  silent?: boolean;
  /**
   * async local storage
   * @private
   */
  private readonly ctxStorage?: AsyncLocalStorage<Context>;
  [util.inspect.custom]?: () => UnknownRecord;
  /**
   * Application constructor.
   *
   * create a new koa application.
   *
   * @example
   * ```ts
   * import App from '@kosmic/koa';
   * const app = new App();
   * ```
   * @param options
   */
  constructor(options?: Options) {
    super();
    options = options || {};
    this.proxy = options.proxy || false;
    this.subdomainOffset = options.subdomainOffset || 2;
    this.proxyIpHeader = options.proxyIpHeader || 'X-Forwarded-For';
    this.maxIpsCount = options.maxIpsCount || 0;
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.compose = options.compose || compose;
    if (options.keys) this.keys = options.keys;

    this.middleware = [];
    this.context = Object.create(koaContext) as Context;
    this.request = Object.create(koaRequest) as KoaRequest;
    this.response = Object.create(koaResponse) as KoaResponse;

    // util.inspect.custom support for node 6+
    /* istanbul ignore else */
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }

    if (options.asyncLocalStorage) {
      assert(
        AsyncLocalStorage,
        'Requires node 12.17.0 or higher to enable asyncLocalStorage',
      );
      this.ctxStorage = new AsyncLocalStorage();
    }
  }

  listen(...args: Parameters<http.Server['listen']>) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  toJSON() {
    return only(this, ['subdomainOffset', 'proxy', 'env']);
  }

  inspect() {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   *
   * all function are async (or Promise returning) functions.
   *
   * @example
   *
   * app.use(async (ctx, next) => {
   *  await next();
   *  ctx.body = 'Hello World';
   * })
   */
  use(fn: Middleware): this {
    if (typeof fn !== 'function')
      throw new TypeError('middleware must be a function!');
    debug('use %s', fn.name || '-');
    this.middleware.push(fn);
    return this;
  }

  callback() {
    const fn = this.compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
      const ctx = this.createContext(req, res);
      if (!this.ctxStorage) {
        return this.handleRequest(ctx, fn);
      }

      return this.ctxStorage.run(ctx, async () => {
        return this.handleRequest(ctx, fn);
      });
    };

    return handleRequest;
  }

  /**
   * return current context from async local storage
   */
  get currentContext() {
    if (this.ctxStorage) return this.ctxStorage.getStore();
    return undefined;
  }

  /**
   * Handle request in callback.
   *
   * @api private
   */

  private handleRequest(
    ctx: Context,
    fnMiddleware: ReturnType<typeof compose>,
  ) {
    const {res} = ctx;
    res.statusCode = 404;
    const onerror = (
      error: Error | HttpError | null,
      message?: string | ServerResponse,
    ) => {
      ctx.onerror(error as HttpError);
    };

    const handleResponse = () => respond(ctx);

    if (onerror) onFinished(res, onerror);

    return fnMiddleware(ctx)
      .then(handleResponse)
      .catch((error: HttpError) => {
        onerror(error, error.message);
      });
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */

  createContext(request_: IncomingMessage, res: ServerResponse): Context {
    const context: Context = Object.create(this.context) as Context;
    const request = (context.request = Object.create(
      this.request,
    ) as KoaRequest);
    const response = (context.response = Object.create(
      this.response,
    ) as KoaResponse);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = request_;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = request_.url;
    context.state = {};
    return context;
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */

  onerror(error: HttpError) {
    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      Object.prototype.toString.call(error) === '[object Error]' ||
      error instanceof Error;
    if (!isNativeError)
      throw new TypeError(util.format('non-error thrown: %j', error));

    if (error.status === 404 || error.expose) return;
    if (this.silent) return;

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const message = error.stack || error.toString();
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    console.error(`\n${message.replace(/^/gm, '  ')}\n`);
  }

  /**
   * Help TS users comply to CommonJS, ESM, bundler mismatch.
   * @see https://github.com/koajs/koa/issues/1513
   */

  static get default() {
    return App;
  }

  createAsyncCtxStorageMiddleware(): Middleware {
    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    const app = this;
    return async function (ctx, next) {
      await app.ctxStorage?.run(ctx, async () => {
        await next();
      });
    };
  }
}

/**
 * Response helper.
 */

function respond(ctx: Context<unknown, any>) {
  // allow bypassing koa
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
  if (ctx.respond === false) return;

  if (!ctx.writable) return;

  const {res} = ctx;
  let {body} = ctx;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) {
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
    if (ctx.response?._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      ctx.length = 0;
      return res.end();
    }

    body =
      ctx.req.httpVersionMajor >= 2
        ? String(code)
        : ctx.message || String(code);

    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body as string);
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
    ctx.length = Buffer.byteLength(body as string);
  }

  res.end(body);
}

/**
 * export types
 */
export {type Middleware, type Next} from './compose.js';
export {type Context, type State} from './context.types.js';
export {type KoaRequest} from './request.types.js';
export {type KoaResponse} from './response.types.js';
export default App;

/* -- EXPORTS -- */
module.exports = App;
/* -- EXPORTS -- */
