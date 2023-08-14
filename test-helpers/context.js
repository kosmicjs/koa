'use strict';

const Stream = require('node:stream');
const Koa = require('../dist/application');

module.exports = (request, res, app) => {
  const socket = new Stream.Duplex();
  request = Object.assign(
    {headers: {}, socket},
    Stream.Readable.prototype,
    request,
  );
  res = Object.assign({_headers: {}, socket}, Stream.Writable.prototype, res);
  request.socket.remoteAddress = request.socket.remoteAddress || '127.0.0.1';
  app = app || new Koa();
  res.getHeader = (k) => res._headers[k.toLowerCase()];
  res.setHeader = (k, v) => {
    res._headers[k.toLowerCase()] = v;
  };

  res.removeHeader = (k) => delete res._headers[k.toLowerCase()];
  return app.createContext(request, res);
};

module.exports.request = (request, res, app) =>
  module.exports(request, res, app).request;

module.exports.response = (request, res, app) =>
  module.exports(request, res, app).response;
