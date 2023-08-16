import {type ParsedUrlQuery} from 'node:querystring';
import {type IncomingMessage, type ServerResponse} from 'node:http';
import type httpAssert from 'http-assert';
import type Cookies from 'cookies';
import type {UnknownRecord, SetOptional} from 'type-fest';
import {type HttpError} from 'http-errors';
import type {KoaResponse} from './response.types';
import type {KoaRequest} from './request.types';
import type Application from './application';
import {type COOKIES} from './context';

/**
 * The types for the base context object
 */
type ContextBase = {
  assert: typeof httpAssert;
  cookies: Cookies | undefined;
  inspect(): any;
  toJSON(): {
    request: any;
    response: any;
    app: any;
    originalUrl: any;
    req: string;
    res: string;
    socket: string;
  };
  throw(...args: any): never;
  onerror(
    error: SetOptional<HttpError, 'status' | 'statusCode' | 'expose'> | null,
  ): void;
};

/**
 * The context object delgate for the response
 */
type ContextResponseDelegation = {
  // response method delegation
  attachment: KoaResponse['attachment'];
  redirect: KoaResponse['redirect'];
  remove: KoaResponse['remove'];
  vary: KoaResponse['vary'];
  has: KoaResponse['has'];
  set: KoaResponse['set'];
  append: KoaResponse['append'];
  flushHeaders: KoaResponse['flushHeaders'];
  // response access delegation
  status: KoaResponse['status'];
  message: KoaResponse['message'];
  body: KoaResponse['body'];
  length: KoaResponse['length'];
  type: KoaResponse['type'];
  lastModified: KoaResponse['lastModified'];
  etag: KoaResponse['etag'];
  // response getter delegation
  readonly headerSent: KoaResponse['headerSent'];
  readonly writable: KoaResponse['writable'];
};

/**
 * The context object delegate for the request
 */
type ContextRequestDelegation = {
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
};

type ContextExtras<State = UnknownRecord> = {
  response: KoaResponse;
  request: KoaRequest;
  req: IncomingMessage;
  res: ServerResponse;
  app: Application;
  respond: boolean;
  originalUrl: string;
  [COOKIES]: Cookies;
  state: State;
};

export type Context<State = UnknownRecord> = ContextBase &
  Partial<ContextExtras<State>> &
  Partial<ContextResponseDelegation> &
  Partial<ContextRequestDelegation>;
