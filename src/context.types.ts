/* eslint-disable @typescript-eslint/no-empty-interface */
import {type IncomingMessage, type ServerResponse} from 'node:http';
import type httpAssert from 'http-assert';
import type Cookies from 'cookies';
import type {UnknownRecord, SetOptional, Simplify} from 'type-fest';
import {type HttpError} from 'http-errors';
import type createError from 'http-errors';
import type {KoaResponse} from './response.types.js';
import type {KoaRequest} from './request.types.js';
import type Application from './application.js';
import {type COOKIES} from './context.js';

/**
 * The types for the base context object
 */
interface ContextBase {
  /**
   * Context can be used to store data
   * and pass it between middleware. Context properties
   * can be added globally at anytime using `app.context` or
   * per request within middleware.
   *
   * To add typed properties to Context, declare them in
   * the module of your choosing:
   *
   * ```ts
   * declare module '@kosmic/koa' {
   *   interface Context {
   *     myProperty: string;
   *   }
   * }
   * ```
   */
  [key: string]: unknown;
  /**
   * Similar to .throw(), adds assertion.
   *
   *    this.assert(this.user, 401, 'Please login!');
   *
   * See: https://github.com/jshttp/http-assert
   */
  assert: typeof httpAssert;
  /**
   * get and set cookies
   */
  cookies: Cookies | undefined;
  /**
   * util.inspect() implementation, which
   * just returns the JSON output.
   */
  inspect(): any;
  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   */
  toJSON(): {
    request: any;
    response: any;
    app: any;
    originalUrl: any;
    req: string;
    res: string;
    socket: string;
  };
  /**
   * Throw an error with `status` (default 500) and
   * `msg`. Note that these are user-level
   * errors, and the message may be exposed to the client.
   *
   *    this.throw(403)
   *    this.throw(400, 'name required')
   *    this.throw('something exploded')
   *    this.throw(new Error('invalid'))
   *    this.throw(400, new Error('invalid'))
   *
   * See: https://github.com/jshttp/http-errors
   *
   * Note: `status` should only be passed as the first parameter.
   */
  throw(...args: Simplify<Parameters<typeof createError>>): never;
  /**
   * Default error handling.
   *
   * Not for public use, avoid using this function
   *
   * @private
   */
  onerror(
    error: SetOptional<HttpError, 'status' | 'statusCode' | 'expose'> | null,
  ): void;
}

/**
 * The context object delgate for the response
 */
interface ContextResponseDelegation {
  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @example
   *
   * ctx.attachment('path/to/logo.png');
   */
  attachment: KoaResponse['attachment'];
  /**
   * Perform a [302] redirect to url.
   *
   * The string "back" is special-cased to provide Referrer support, when Referrer is not present alt or "/" is used.
   *
   * @example
   * ```ts
   * ctx.redirect('back');
   * ctx.redirect('back', '/index.html');
   * ctx.redirect('/login');
   * ctx.redirect('http://google.com');
   * ```
   *
   * To alter the default status of 302, simply assign the status before or after this call. To alter the body, assign it after this call:
   *
   * @example
   * ```ts
   * ctx.status = 301;
   * ctx.redirect('/cart');
   * ctx.body = 'Redirecting to shopping cart';
   * ```
   */
  redirect: KoaResponse['redirect'];
  remove: KoaResponse['remove'];
  vary: KoaResponse['vary'];
  has: KoaResponse['has'];
  set: KoaResponse['set'];
  append: KoaResponse['append'];
  flushHeaders: KoaResponse['flushHeaders'];
  // response access delegation
  /**
   * ctx.status=
   *
   * Get/set response status code.
   */
  status: KoaResponse['status'];
  /**
   * ctx.message
   *
   * Get/Set response status message
   */
  message: KoaResponse['message'];
  /**
   * ctx.body
   *
   * Get/Set response body.
   *
   * Set response body to one of the following:
   *
   * - `string` written
   * - `Buffer` written
   * - `Stream` piped
   * - `Object || Array` json-stringified
   * - `null || undefined` no content response
   *
   * If response.status has not been set, Koa will automatically set the status to 200 or 204 depending on response.body. Specifically, if response.body has not been set or has been set as null or undefined, Koa will automatically set response.status to 204. If you really want to send no content response with other status, you should override the 204 status as the following way:
   *
   * @exmple
   * ```ts
   * // This must be always set first before status, since null | undefined
   * // body automatically sets the status to 204
   * ctx.body = null;
   *
   * // Now we override the 204 status with the desired one
   * ctx.status = 200;
   * ```
   *
   * Koa doesn't guard against everything that could be put as a response body -- a function doesn't serialise meaningfully, returning a boolean may make sense based on your application, and while an error works, it may not work as intended as some properties of an error are not enumerable. We recommend adding middleware in your app that asserts body types per app. A sample middleware might be:
   *
   * @example
   * ```ts
   * app.use(async (ctx, next) => {
   *   await next()
   *   ctx.assert.equal('object', typeof ctx.body, 500, 'some dev did something wrong')
   * })
   * ```
   */
  body: KoaResponse['body'];
  /**
   * ctx.length
   *
   * Get/Set response Content-Length
   *
   * @example
   * ```ts
   * console.log(ctx.length); // 512
   * ctx.length = 1024;
   * ```
   */
  length: KoaResponse['length'];
  type: KoaResponse['type'];
  lastModified: KoaResponse['lastModified'];
  etag: KoaResponse['etag'];
  // response getter delegation
  readonly headerSent: KoaResponse['headerSent'];
  readonly writable: KoaResponse['writable'];
}

/**
 * The context object delegate for the request
 */
interface ContextRequestDelegation {
  // request method delegation
  acceptsLanguages: KoaRequest['acceptsLanguages'];
  acceptsEncodings: KoaRequest['acceptsEncodings'];
  acceptsCharsets: KoaRequest['acceptsCharsets'];
  accepts: KoaRequest['accepts'];
  get: KoaRequest['get'];
  is: KoaRequest['is'];
  // request access delegation
  querystring: KoaRequest['querystring'];
  idempotent: KoaRequest['idempotent'];
  socket: KoaRequest['socket'];
  search: KoaRequest['search'];
  method: KoaRequest['method'];
  query: KoaRequest['query'];
  path: KoaRequest['path'];
  url: KoaRequest['url'];
  accept: KoaRequest['accept'];
  // request getter delegation
  readonly origin: KoaRequest['origin'];
  readonly href: KoaRequest['href'];
  readonly subdomains: KoaRequest['subdomains'];
  readonly protocol: KoaRequest['protocol'];
  readonly host: KoaRequest['host'];
  readonly hostname: KoaRequest['hostname'];
  readonly URL: KoaRequest['URL'];
  readonly header: KoaRequest['header'];
  readonly headers: KoaRequest['headers'];
  readonly secure: KoaRequest['secure'];
  readonly stale: KoaRequest['stale'];
  readonly fresh: KoaRequest['fresh'];
  readonly ips: KoaRequest['ips'];
  readonly ip: KoaRequest['ip'];
}

interface ContextExtras<UserState = State> {
  /**
   * A Koa Response object
   */
  response: KoaResponse;
  /**
   * A Koa Request object
   */
  request: KoaRequest;
  /**
   * The node js request object
   *
   * Avoid changing this object and prefer using the ctx.request object instead.
   */
  req: IncomingMessage;
  /**
   * The node js response object
   *
   * Bypassing Koa's response handling is not supported. Avoid using the following node properties:
   *  - res.statusCode
   *  - res.writeHead()
   *  - res.write()
   *  - res.end()
   */
  res: ServerResponse;
  /**
   * A reference to the current application instance
   */
  app: Application;
  respond: boolean;
  originalUrl?: string;
  [COOKIES]?: Cookies;
  /**
   * State is the recommended namespace for passing information
   * through middleware and to your frontend views.
   *
   * State can be used to store data
   * and pass it between middleware. State properties
   * can be added globally at anytime using `app.context` or
   * per request within middleware.
   *
   * To add typed properties to State, declare them in
   * the module of your choosing:
   *
   * ```ts
   * declare module '@kosmic/koa' {
   *   interface State {
   *     myProperty: string;
   *   }
   * }
   * ```
   */
  state: UserState;
}

/**
 * To help maintain type compatibility with current third party types we
 * can just use the names of the types instead of the types themselves for extending where we want
 */
export interface ExtendableContext {}

/**
 * The internal context object meant for internal use only
 */
export type InternalContext<State = UnknownRecord> = ContextBase &
  Partial<ContextExtras<State>> &
  Partial<ContextResponseDelegation> &
  Partial<ContextRequestDelegation>;

/**
 * extendable ctx.state interface
 */
export interface State extends UnknownRecord {}

/**
 * The extendable context object
 */
export interface Context<UserState = State>
  extends Simplify<
    ContextBase &
      ContextExtras<UserState> &
      ContextResponseDelegation &
      ContextRequestDelegation &
      ExtendableContext
  > {}
