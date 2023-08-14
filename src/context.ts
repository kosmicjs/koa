/**
 * Module dependencies.
 */

import util from 'node:util';
import {Buffer} from 'node:buffer';
import createError, {type HttpError} from 'http-errors';
import statuses from 'statuses';
import Cookies from 'cookies';
import delegate from 'delegates';
import type {Context} from './context.types';

export const COOKIES = Symbol('context#cookies');

const context: Context = {
  get querystring() {
    return this.request!.querystring;
  },

  set querystring(value: string) {
    this.request!.querystring = value;
  },

  get idempotent() {
    return this.request!.idempotent;
  },

  set idempotent(value) {
    // @ts-expect-error - idempotent is readonly
    this.request!.idempotent = value;
  },

  get search() {
    return this.request!.search;
  },

  set search(value) {
    this.request!.search = value;
  },

  get method() {
    return this.request!.method;
  },

  set method(value) {
    this.request!.method = value;
  },

  get path() {
    return this.request!.path;
  },

  set path(value) {
    this.request!.path = value!;
  },

  get query() {
    return this.request!.query;
  },

  set query(value) {
    this.request!.query = value;
  },

  get href() {
    return this.request!.href;
  },

  get subdomains() {
    return this.request!.subdomains;
  },

  /**
   * util.inspect() implementation, which
   * just returns the JSON output.
   *
   * @return {Object},
   * @api public
   */

  inspect() {
    return this.toJSON();
  },

  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   *
   * @return {Object},
   * @api public
   */
  toJSON() {
    return {
      request: this.request!.toJSON(),
      response: this.response!.toJSON(),
      app: this.app!.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>',
    };
  },

  throw(...args: Parameters<typeof createError>) {
    throw createError(...args);
  },

  onerror(error: HttpError | null) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (error == null) return;

    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      Object.prototype.toString.call(error) === '[object Error]' ||
      error instanceof Error;
    if (!isNativeError && error)
      error = new Error(
        util.format('non-error thrown: %j', error),
      ) as HttpError;

    let headerSent = false;
    if ((this.headerSent ?? !this.writable) && error) {
      headerSent = true;
      error.headerSent = true;
    }

    // delegate
    this.app!.emit('error', error, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const res = this.res!;

    for (const name of res.getHeaderNames()) res.removeHeader(name);

    // then set those specified
    if (error.headers) this.response!.set(error.headers);

    // force text/plain
    this.type = 'text';

    let statusCode = error.status || error.statusCode;

    // ENOENT support
    if (error.code === 'ENOENT') statusCode = 404;

    // default to 500
    if (typeof statusCode !== 'number' || !statuses(statusCode))
      statusCode = 500;

    // respond
    const code = statuses(statusCode);
    const message = error.expose ? error.message : code;

    this.status = error.status = statusCode;
    this.length = Buffer.byteLength(message);
    res.end(message);
  },

  get cookies() {
    if (!this[COOKIES] && this.req && this.res) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app!.keys,
        secure: this.request!.secure,
      });
    }

    return this[COOKIES];
  },

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  },
};

delegate(context, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('has')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

/**
 * Request delegation.
 */

delegate(context, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');

export default context;
