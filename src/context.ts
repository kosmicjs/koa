/**
 * Module dependencies.
 */

import {inspect, format} from 'node:util';
import {Buffer} from 'node:buffer';
import {type OutgoingHttpHeaders} from 'node:http';
import createError, {type UnknownError, type HttpError} from 'http-errors';
import httpAssert from 'http-assert';
import statuses from 'statuses';
import Cookies from 'cookies';
import delegate from 'delegates';
import type {InternalContext} from './context.types.js';

export const COOKIES = Symbol('context#cookies');

const context: InternalContext = {
  inspect() {
    if (this === context) return this;
    return this.toJSON();
  },
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
  assert: httpAssert,
  throw(n, ...args) {
    throw createError<typeof n extends number ? number : any>(n, ...args);
  },
  onerror(err) {
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
    if (!isNativeError) err = new Error(format('non-error thrown: %j', err));

    let headerSent = false;
    if (this.headerSent || !this.writable) {
      headerSent = err.headerSent = true;
    }

    // delegate
    this.app!.emit('error', err, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const res = this.res!;

    // first unset all headers
    /* istanbul ignore else */
    if (typeof res.getHeaderNames === 'function') {
      for (const name of res.getHeaderNames()) res.removeHeader(name);
    } else {
      // @ts-expect-error Node < 7.7
      (res._headers as OutgoingHttpHeaders) = {}; // Node < 7.7
    }

    // then set those specified
    this.set!(err.headers!);

    // force text/plain
    this.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if (err.code === 'ENOENT') statusCode = 404;

    // default to 500
    if (typeof statusCode !== 'number' || !statuses[statusCode])
      statusCode = 500;

    // respond
    const code = statuses[statusCode];
    const msg = err.expose ? err.message : code;
    this.status = err.status = statusCode;
    this.length = Buffer.byteLength(msg || '');
    res.end(msg);
  },

  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req!, this.res!, {
        keys: this.app!.keys,
        secure: this.request!.secure,
      });
    }

    return this[COOKIES];
  },

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  },

  [inspect.custom]() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.inspect();
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

/**
 * Custom inspection implementation for newer Node.js versions.
 *
 * @return {Object}
 * @api public
 */

/* -- EXPORTS -- */
module.exports = context;
/* -- EXPORTS -- */
