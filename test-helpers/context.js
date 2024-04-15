'use strict';

const Stream = require('node:stream');
// eslint-disable-next-line import/extensions
const Koa = require('../dist/application').default;

module.exports = (req, res, app) => {
  const socket = new Stream.Duplex();
  // eslint-disable-next-line prefer-object-spread
  req = Object.assign({headers: {}, socket}, Stream.Readable.prototype, req);
  // eslint-disable-next-line prefer-object-spread
  res = Object.assign({_headers: {}, socket}, Stream.Writable.prototype, res);
  req.socket.remoteAddress ||= '127.0.0.1';
  app ||= new Koa();
  res.getHeader = (k) => res._headers[k.toLowerCase()];
  res.setHeader = (k, v) => {
    res._headers[k.toLowerCase()] = v;
  };

  res.removeHeader = (k, _v) => delete res._headers[k.toLowerCase()];
  return app.createContext(req, res);
};

module.exports.request = (request, res, app) =>
  module.exports(request, res, app).request;

module.exports.response = (request, res, app) =>
  module.exports(request, res, app).response;
