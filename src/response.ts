/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import {type URL, format as stringify, type Url} from 'node:url';
import {Buffer} from 'node:buffer';
import net from 'node:net';
import {type ParsedUrlQuery} from 'node:querystring';
import {type ServerResponse, type IncomingMessage} from 'node:http';
import assert from 'node:assert';
import {extname} from 'node:path';
import Stream from 'node:stream';
import contentDisposition from 'content-disposition';
import onFinish from 'on-finished';
import escape from 'escape-html';
import statuses from 'statuses';
import destroy from 'destroy';
import vary from 'vary';
import encodeUrl from 'encodeurl';
import {is as typeis} from 'type-is';
import only from './node-only';
import getType from './cache-content-type';

/**
 * Prototype.
 */

import type KoaContext from './context';
import type Application from './application';
import type KoaRequest from './request';

class KoaResponse {
  req: IncomingMessage;
  request?: KoaRequest;
  response: ServerResponse;
  res: ServerResponse;
  originalUrl: string;
  memoizedURL?: URL | Record<string, unknown>;
  app: Application;
  ctx?: KoaContext;
  _explicitNullBody?: boolean;
  private _explicitStatus?: boolean;
  // eslint-disable-next-line @typescript-eslint/ban-types
  private _body?: Record<string, unknown> | null | string | Buffer | Stream;
  private readonly _querycache?: Record<string, ParsedUrlQuery>;
  constructor({
    _req,
    _res,
    _app,
  }: {
    _req: IncomingMessage;
    _res: ServerResponse;
    _app: Application;
  }) {
    this.req = _req;
    this.res = _res;
    this.response = _res;
    this.app = _app;
    this.originalUrl = this.req.url || '';
  }
  /**
   * Return the request socket.
   *
   * @return {Connection}
   * @api public
   */

  get socket() {
    return this.res.socket;
  }

  /**
   * Return response header.
   *
   * @return {Object}
   * @api public
   */

  get header() {
    const {res} = this;

    return res.getHeaders();
  }

  /**
   * Return response header, alias as response.header
   *
   * @return {Object}
   * @api public
   */

  get headers() {
    return this.header;
  }

  /**
   * Get response status code.
   *
   * @return {Number}
   * @api public
   */

  get status() {
    return this.res.statusCode;
  }

  /**
   * Set response status code.
   *
   * @param {Number} code
   * @api public
   */

  set status(code) {
    if (this.headerSent) return;

    assert(Number.isInteger(code), 'status code must be a number');
    assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2) this.res.statusMessage = statuses(code);
    if (this.body && statuses.empty[code]) this.body = null;
  }

  /**
   * Get response status message
   *
   * @return {String}
   * @api public
   */

  get message() {
    return this.res.statusMessage || statuses.message[this.status];
  }

  /**
   * Set response status message
   *
   * @param {String} msg
   * @api public
   */

  set message(msg) {
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
    this.res.statusMessage = msg ? msg : '';
  }

  /**
   * Get response body.
   *
   * @return {Mixed}
   * @api public
   */

  get body() {
    return this._body;
  }

  /**
   * Set response body.
   *
   * @param {String|Buffer|Object|Stream} val
   * @api public
   */

  set body(val) {
    const original = this._body;
    this._body = val;

    // no content
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (val == null) {
      if (!statuses.empty[this.status]) {
        if (this.type === 'application/json') {
          this._body = 'null';
          return;
        }

        this.status = 204;
      }

      if (val === null) this._explicitNullBody = true;
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
    if (!this._explicitStatus) this.status = 200;

    // set the content-type only if not yet set
    const setType = !this.has('Content-Type');

    // string
    if (typeof val === 'string') {
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
    if (val instanceof Stream) {
      onFinish(this.res, destroy.bind(null, val));
      if (original !== val) {
        val.once('error', (err) => {
          this.ctx?.onerror(err);
        });
        // overwriting
        // eslint-disable-next-line no-eq-null, eqeqeq
        if (original != null) this.remove('Content-Length');
      }

      if (setType) this.type = 'bin';
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
  }

  /**
   * Return parsed response Content-Length when present.
   *
   * @return {Number}
   * @api public
   */

  get length(): number {
    if (this.has('Content-Length')) {
      return Number.parseInt(this.get('Content-Length') as string, 10) || 0;
    }

    const {body} = this;
    if (!body || body instanceof Stream) return 0;
    if (typeof body === 'string') return Buffer.byteLength(body);
    if (Buffer.isBuffer(body)) return body.length;
    return Buffer.byteLength(JSON.stringify(body));
  }

  /**
   * Set Content-Length field to `n`.
   *
   * @param {Number} n
   * @api public
   */

  set length(n: number) {
    if (n && !this.has('Transfer-Encoding')) {
      this.set('Content-Length', String(n));
    }
  }

  /**
   * Check if a header has been written to the socket.
   *
   * @return {Boolean}
   * @api public
   */

  get headerSent() {
    return this.res.headersSent;
  }

  /**
   * Vary on `field`.
   *
   * @param {String} field
   * @api public
   */

  vary(field: string) {
    if (this.headerSent) return;

    vary(this.res, field);
  }

  /**
   * Perform a 302 redirect to `url`.
   *
   * The string "back" is special-cased
   * to provide Referrer support, when Referrer
   * is not present `alt` or "/" is used.
   *
   * Examples:
   *
   *    this.redirect('back');
   *    this.redirect('back', '/index.html');
   *    this.redirect('/login');
   *    this.redirect('http://google.com');
   *
   * @param {String} url
   * @param {String} [alt]
   * @api public
   */

  redirect(url: string, alt: string) {
    // location
    if (url === 'back')
      url = (this.ctx?.get('Referrer') || alt || '/') as string;
    this.set('Location', encodeUrl(url));

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx?.accepts('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  }

  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @param {String} filename
   * @api public
   */

  attachment(filename: string, options: contentDisposition.Options) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  }

  /**
   * Get the Last-Modified date in Date form, if it exists.
   *
   * @return {Date}
   * @api public
   */

  get lastModified(): Date | undefined {
    const date = this.get('last-modified') as string;
    if (date) return new Date(date);
    return undefined;
  }

  /**
   * Set the Last-Modified date using a string or a Date.
   *
   *     this.response.lastModified = new Date();
   *     this.response.lastModified = '2013-09-13';
   *
   * @param {String|Date} type
   * @api public
   */

  set lastModified(val: string | Date | undefined) {
    if (typeof val === 'string') val = new Date(val);
    if (val) this.set('Last-Modified', val.toUTCString());
  }

  /**
   * Get the ETag of a response.
   *
   * @return {String}
   * @api public
   */

  get etag(): string {
    return this.get('ETag') as string;
  }

  /**
   * Set the ETag of a response.
   * This will normalize the quotes if necessary.
   *
   *     this.response.etag = 'md5hashsum';
   *     this.response.etag = '"md5hashsum"';
   *     this.response.etag = 'W/"123456789"';
   *
   * @param {String} etag
   * @api public
   */

  set etag(val: string) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  }

  /**
   * Return the response mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */

  get type(): string {
    const type = this.get('Content-Type') as string;
    if (!type) return '';
    return type.split(';', 1)[0];
  }

  /**
   * Set Content-Type response header with `type` through `mime.lookup()`
   * when it does not contain a charset.
   *
   * Examples:
   *
   *     this.type = '.html';
   *     this.type = 'html';
   *     this.type = 'json';
   *     this.type = 'application/json';
   *     this.type = 'png';
   *
   * @param {String} type
   * @api public
   */

  set type(type: string) {
    type = getType(type) as string;
    if (type) {
      this.set('Content-Type', type);
    } else {
      this.remove('Content-Type');
    }
  }

  /**
   * Check whether the response is one of the listed types.
   * Pretty much the same as `this.request.is()`.
   *
   * @param {String|String[]} [type]
   * @param {String[]} [types]
   * @return {String|false}
   * @api public
   */

  is(type: string, ...types: string[]) {
    return typeis(this.type, type, ...types);
  }

  /**
   * Return response header.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   * @param {String} field
   * @return {any}
   * @api public
   */

  get(field: string) {
    return this.res.getHeader(field);
  }

  /**
   * Returns true if the header identified by name is currently set in the outgoing headers.
   * The header name matching is case-insensitive.
   *
   * Examples:
   *
   *     this.has('Content-Type');
   *     // => true
   *
   *     this.get('content-type');
   *     // => true
   *
   * @param {String} field
   * @return {boolean}
   * @api public
   */

  has(field: string) {
    return typeof this.res.hasHeader === 'function'
      ? this.res.hasHeader(field)
      : // Node < 7.7
        field.toLowerCase() in (this.headers as Record<string, unknown>);
  }

  /**
   * Set header `field` to `val` or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    this.set('Foo', ['bar', 'baz']);
   *    this.set('Accept', 'application/json');
   *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * @param {String|Object|Array} field
   * @param {String} val
   * @api public
   */

  set(
    field: string | Record<string, string>,
    val?: number | string | string[],
  ) {
    if (this.headerSent) return;

    if (typeof field === 'string' && val) {
      if (Array.isArray(val))
        val = val.map((v) => (typeof v === 'string' ? v : String(v)));
      else if (typeof val !== 'string') val = String(val);
      this.res.setHeader(field, val);
    } else if (arguments.length === 1) {
      for (const [key, _val] of Object.entries(field)) {
        this.set(key, _val);
      }
    }
  }

  /**
   * Append additional header `field` with value `val`.
   *
   * Examples:
   *
   * ```
   * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   * this.append('Warning', '199 Miscellaneous warning');
   * ```
   *
   * @param {String} field
   * @param {String|Array} val
   * @api public
   */

  append(field: string, val: number | string | string[]) {
    const prev = this.get(field);

    if (prev) {
      val = Array.isArray(prev)
        ? prev.concat(String(val))
        : [String(prev)].concat(String(val));
    }

    this.set(field, val);
  }

  /**
   * Remove header `field`.
   *
   * @param {String} name
   * @api public
   */

  remove(field: string) {
    if (this.headerSent) return;

    this.res.removeHeader(field);
  }

  /**
   * Checks if the request is writable.
   * Tests for the existence of the socket
   * as node sometimes does not set it.
   *
   * @return {Boolean}
   * @api private
   */

  get writable() {
    // can't write any more after response finished
    // response.writableEnded is available since Node > 12.9
    // https://nodejs.org/api/http.html#http_response_writableended
    // response.finished is undocumented feature of previous Node versions
    // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
    if (this.res.writableEnded || this.res.finished) return false;

    const socket = this.res.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    if (!this.res) return;
    const o = this.toJSON();
    o.body = this.body;
    return o;
  }

  /**
   * Return JSON representation.
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, ['status', 'message', 'header']);
  }

  /**
   * Flush any set headers and begin the body
   */

  flushHeaders() {
    this.res.flushHeaders();
  }
}

export default KoaResponse;
