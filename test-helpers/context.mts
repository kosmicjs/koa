import Stream from 'node:stream';
import {type IncomingMessage, type ServerResponse} from 'node:http';
import Koa from '../dist/esm/application.mjs';

const fn = (
  req: IncomingMessage,
  res: ServerResponse & {_headers: Record<string, string>},
  app?: Koa,
) => {
  const socket = new Stream.Duplex();
  // eslint-disable-next-line prefer-object-spread
  req = Object.assign({headers: {}, socket}, Stream.Readable.prototype, req);
  // eslint-disable-next-line prefer-object-spread
  res = Object.assign({_headers: {}, socket}, Stream.Writable.prototype, res);
  // @ts-expect-error stupid readonlys
  req.socket.remoteAddress = req.socket.remoteAddress || '127.0.0.1';
  app = app || new Koa();
  res.getHeader = (k: string) => res._headers[k.toLowerCase()];
  // @ts-expect-error stupid readonlys
  res.setHeader = (k: string, v: string) => {
    res._headers[k.toLowerCase()] = v;
  };

  // @ts-expect-error stupid readonlys
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/no-unsafe-call
  res.removeHeader = (k, _v) => delete res._headers[k.toLowerCase()];
  return app.createContext(req, res);
};

export default fn;

export const request = (
  request: IncomingMessage,
  res: ServerResponse & {_headers: Record<string, string>},
  app: Koa,
) => fn(request, res, app).request;

export const response = (
  request: IncomingMessage,
  res: ServerResponse & {_headers: Record<string, string>},
  app: Koa,
) => fn(request, res, app).response;
