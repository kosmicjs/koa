/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import {Buffer} from 'node:buffer';
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
import {type HttpError} from 'http-errors';
import only from './node-only';
import getType from './cache-content-type';
import type {KoaResponse} from './response.types';

/**
 * Prototype.
 */
const koaResponse: KoaResponse = {
  _explicitNullBody: false,
  /**
   * Return the request socket.
   *
   * @return {Connection}
   * @api public
   */

  get socket() {
    return this.res!.socket!;
  },

  get header() {
    return this.res!.getHeaders();
  },

  get headers() {
    return this.header;
  },

  /**
   * Get response status code.
   *
   * @return {Number}
   * @api public
   */

  get status() {
    return this.res!.statusCode;
  },

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
    this.res!.statusCode = code;
    if (this.req!.httpVersionMajor < 2)
      this.res!.statusMessage = statuses(code);
    if (this.body && statuses.empty[code]) this.body = null;
  },

  /**
   * Get response status message
   *
   * @return {String}
   * @api public
   */

  get message() {
    return this.res!.statusMessage || statuses.message[this.status]!;
  },

  /**
   * Set response status message
   *
   * @param {String} msg
   * @api public
   */

  set message(message) {
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
    this.res!.statusMessage = message ? message : '';
  },

  /**
   * Get response body.
   *
   * @return {Mixed}
   * @api public
   */

  get body() {
    return this._body!;
  },

  /**
   * Set response body.
   *
   * @param {String|Buffer|Object|Stream} val
   * @api public
   */

  set body(value) {
    const original = this._body;
    this._body = value;

    // no content
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (value == null) {
      if (this.status && !statuses.empty[this.status]) {
        if (this.type === 'application/json') {
          this._body = 'null';
          return;
        }

        this.status = 204;
      }

      if (value === null) this._explicitNullBody = true;
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
    if (typeof value === 'string') {
      if (setType) this.type = /^\s*</.test(value) ? 'html' : 'text';
      this.length = Buffer.byteLength(value);
      return;
    }

    // buffer
    if (Buffer.isBuffer(value)) {
      if (setType) this.type = 'bin';
      this.length = value.length;
      return;
    }

    // stream
    if (value instanceof Stream) {
      onFinish(this.res!, destroy.bind(null, value));
      if (original !== value) {
        value.once('error', (error: HttpError) => {
          this.ctx?.onerror(error);
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
  },

  /**
   * Return parsed response Content-Length when present.
   *
   * @return {Number}
   * @api public
   */

  get length(): number {
    if (this.has('Content-Length')) {
      const cl = this.get('Content-Length');
      if (typeof cl === 'string') return Number.parseInt(cl, 10) || 0;
    }

    const {body} = this;
    if (!body || body instanceof Stream) return 0;
    if (typeof body === 'string') return Buffer.byteLength(body);
    if (Buffer.isBuffer(body)) return body.length;
    return Buffer.byteLength(JSON.stringify(body));
  },

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
  },

  /**
   * Check if a header has been written to the socket.
   *
   * @return {Boolean}
   * @api public
   */

  get headerSent() {
    return this.res!.headersSent;
  },

  /**
   * Vary on `field`.
   *
   * @param {String} field
   * @api public
   */

  vary(field: string) {
    if (this.headerSent) return;

    vary(this.res!, field);
  },

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
    if (url === 'back') url = this.ctx?.get!('Referrer') || alt || '/';
    this.set('Location', encodeUrl(url));

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx?.accepts!('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  },

  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @param {String} filename
   * @api public
   */

  attachment(filename: string, options: contentDisposition.Options) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  },

  /**
   * Get the Last-Modified date in Date form, if it exists.
   *
   * @return {Date}
   * @api public
   */

  get lastModified() {
    const date = this.get('last-modified');
    if (typeof date === 'string' || typeof date === 'number')
      return new Date(date);
    return undefined;
  },

  /**
   * Set the Last-Modified date using a string or a Date.
   *
   *     this.response.lastModified = new Date();
   *     this.response.lastModified = '2013-09-13';
   *
   * @param {String|Date} type
   * @api public
   */

  set lastModified(value: string | Date | undefined) {
    if (typeof value === 'string') value = new Date(value);
    if (value) this.set('Last-Modified', value.toUTCString());
  },

  /**
   * Get the ETag of a response.
   *
   * @return {String}
   * @api public
   */

  get etag() {
    return this.get('ETag') as unknown as string;
  },

  /**
   * Set the ETag of a response.
   * this will normalize the quotes if necessary.
   *
   *     this.response.etag = 'md5hashsum';
   *     this.response.etag = '"md5hashsum"';
   *     this.response.etag = 'W/"123456789"';
   *
   * @param {String} etag
   * @api public
   */

  set etag(value: string) {
    if (!/^(W\/)?"/.test(value)) value = `"${value}"`;
    this.set('ETag', value);
  },

  /**
   * Return the response mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */

  get type(): string {
    const type = this.get('Content-Type') as unknown as string;
    if (!type) return '';
    return type.split(';', 1)[0];
  },

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
  },

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
  },

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
    return this.res!.getHeader(field);
  },

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
    return typeof this.res!.hasHeader === 'function'
      ? this.res!.hasHeader(field)
      : // Node < 7.7
        field.toLowerCase() in (this.headers as Record<string, unknown>);
  },

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
    value?: number | string | string[],
  ) {
    if (this.headerSent) return;

    if (typeof field === 'string' && value) {
      if (Array.isArray(value))
        value = value.map((v) => (typeof v === 'string' ? v : String(v)));
      else if (typeof value !== 'string') value = String(value);
      this.res!.setHeader(field, value);
    } else if (arguments.length === 1) {
      for (const [key, _value] of Object.entries(field)) {
        this.set(key, _value);
      }
    }
  },

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

  append(field: string, value: number | string | string[]) {
    const previous = this.get(field);

    if (previous) {
      value = Array.isArray(previous)
        ? previous.concat(String(value))
        : [String(previous)].concat(String(value));
    }

    this.set(field, value);
  },

  /**
   * Remove header `field`.
   *
   * @param {String} name
   * @api public
   */

  remove(field: string) {
    if (this.headerSent) return;

    this.res!.removeHeader(field);
  },

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
    if (this.res!.writableEnded || this.res!.finished) return false;

    const socket = this.res!.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  },

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    if (!this.res!) return {};
    const o = this.toJSON();
    o.body = this.body;
    return o;
  },

  /**
   * Return JSON representation.
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, ['status', 'message', 'header']);
  },

  /**
   * Flush any set headers and begin the body
   */

  flushHeaders() {
    this.res!.flushHeaders();
  },
};

export default koaResponse;
