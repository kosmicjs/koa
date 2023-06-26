/**
 * Module dependencies.
 */

import util from 'node:util';
import {Buffer} from 'node:buffer';
import {type IncomingMessage, type ServerResponse} from 'node:http';
import createError, {type HttpError} from 'http-errors';
import httpAssert from 'http-assert';
import statuses from 'statuses';
import Cookies from 'cookies';

import type Application from './application';
import KoaRequest from './request';
import KoaResponse from './response';

const COOKIES = Symbol('context#cookies');

class Context {
  [key: string]: any;
  app: Application;
  req: KoaRequest['request'];
  request: KoaRequest;
  res: KoaResponse['response'];
  response: KoaResponse;
  state: Record<string, unknown>;
  attachment: KoaResponse['attachment'];
  redirect: KoaResponse['redirect'];
  remove: KoaResponse['remove'];
  vary: KoaResponse['vary'];
  has: KoaResponse['has'];
  set: KoaResponse['set'];
  append: KoaResponse['append'];
  flushHeaders: KoaResponse['flushHeaders'];
  acceptsLanguages: KoaRequest['acceptsLanguages'];
  acceptsEncodings: KoaRequest['acceptsEncodings'];
  acceptsCharsets: KoaRequest['acceptsCharsets'];
  accepts: KoaRequest['accepts'];
  get: KoaRequest['get'];
  is: KoaRequest['is'];
  assert: typeof httpAssert;
  status?: number;
  headerSent?: boolean;
  writable?: boolean;
  originalUrl?: string;
  type?: string;
  length?: number;
  [COOKIES]?: Cookies;
  respond?: boolean;
  body?: any;
  message?: string;

  constructor({
    _app,
    _req,
    _res,
    ...rest
  }: {
    [key: string]: any;
    _app: Application;
    _req: IncomingMessage;
    _res: ServerResponse;
  }) {
    for (const key in rest) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      if (Object.hasOwnProperty.call(rest, key)) this[key] = rest[key];
    }

    this.app = _app;
    this.req = _req;
    this.res = _res;
    this.request = new KoaRequest({_app, _req, _res});
    this.response = new KoaResponse({_res, _req, _app});
    this.state = {};
    this.assert = httpAssert;

    this.attachment = this.response.attachment.bind(this.response);
    this.redirect = this.response.redirect.bind(this.response);
    this.remove = this.response.remove.bind(this.response);
    this.vary = this.response.vary.bind(this.response);
    this.has = this.response.has.bind(this.response);
    this.set = this.response.set.bind(this.response);
    this.append = this.response.append.bind(this.response);
    this.flushHeaders = this.response.flushHeaders.bind(this.response);

    this.acceptsLanguages = this.request.acceptsLanguages.bind(this.request);
    this.acceptsEncodings = this.request.acceptsEncodings.bind(this.request);
    this.acceptsCharsets = this.request.acceptsCharsets.bind(this.request);
    this.accepts = this.request.accepts.bind(this.request);
    this.get = this.request.get.bind(this.request);
    this.is = this.request.is.bind(this.request);
  }

  get querystring() {
    return this.request.querystring;
  }

  set querystring(val) {
    this.request.querystring = val;
  }

  get idempotent() {
    return this.request.idempotent;
  }

  set idempotent(val) {
    // @ts-expect-error - idempotent is readonly
    this.request.idempotent = val;
  }

  get socket() {
    return this.request.socket;
  }

  set socket(val) {
    // @ts-expect-error - idempotent is readonly
    this.request.socket = val;
  }

  get search() {
    return this.request.search;
  }

  set search(val) {
    this.request.search = val;
  }

  get method() {
    return this.request.method;
  }

  set method(val) {
    this.request.method = val;
  }

  get path() {
    return this.request.path;
  }

  set path(val) {
    this.request.path = val;
  }

  get query() {
    return this.request.query;
  }

  set query(val) {
    this.request.query = val;
  }

  get url() {
    return this.request.url;
  }

  set url(val) {
    this.request.url = val;
  }

  get accept() {
    return this.request.accept;
  }

  set accept(val) {
    this.request.accept = val;
  }

  get href() {
    return this.request.href;
  }

  get subdomains() {
    return this.request.subdomains;
  }

  /**
   * util.inspect() implementation, which
   * just returns the JSON output.
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    return this.toJSON();
  }

  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>',
    };
  }

  throw(...args: Parameters<typeof createError>) {
    throw createError(...args);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  onerror(err: (Error & HttpError) | null) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (err == null) return;

    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      Object.prototype.toString.call(err) === '[object Error]' ||
      err instanceof Error;
    if (!isNativeError && err)
      err = new Error(util.format('non-error thrown: %j', err)) as HttpError;

    let headerSent = false;
    if ((this.headerSent ?? !this.writable) && err) {
      headerSent = true;
      err.headerSent = true;
    }

    // delegate
    this.app.emit('error', err, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const {res} = this;

    for (const name of res.getHeaderNames()) res.removeHeader(name);

    // then set those specified
    if (err.headers) this.set(err.headers);

    // force text/plain
    this.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if (err.code === 'ENOENT') statusCode = 404;

    // default to 500
    if (typeof statusCode !== 'number' || !statuses(statusCode))
      statusCode = 500;

    // respond
    const code = statuses(statusCode);
    const msg = err.expose ? err.message : code;
    // eslint-disable-next-line no-multi-assign
    this.status = err.status = statusCode;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  }

  get cookies() {
    if (!this[COOKIES] && this.req) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure,
      });
    }

    return this[COOKIES];
  }

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  }
}

export default Context;
