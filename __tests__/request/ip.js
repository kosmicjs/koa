'use strict';

const assert = require('node:assert');
const Stream = require('node:stream');
const Koa = require('../../dist/application');
const Request = require('../../test-helpers/context').request;

describe('req.ip', () => {
  describe('with req.ips present', () => {
    it('should return req.ips[0]', () => {
      const app = new Koa();
      const request_ = {headers: {}, socket: new Stream.Duplex()};
      app.proxy = true;
      request_.headers['x-forwarded-for'] = '127.0.0.1';
      request_.socket.remoteAddress = '127.0.0.2';
      const request = Request(request_, undefined, app);
      assert.strictEqual(request.ip, '127.0.0.1');
    });
  });

  describe('with no req.ips present', () => {
    it('should return req.socket.remoteAddress', () => {
      const request_ = {socket: new Stream.Duplex()};
      request_.socket.remoteAddress = '127.0.0.2';
      const request = Request(request_);
      assert.strictEqual(request.ip, '127.0.0.2');
    });

    describe('with req.socket.remoteAddress not present', () => {
      it('should return an empty string', () => {
        const socket = new Stream.Duplex();
        Object.defineProperty(socket, 'remoteAddress', {
          get: () => undefined, // So that the helper doesn't override it with a reasonable value
          set() {},
        });
        assert.strictEqual(Request({socket}).ip, '');
      });
    });
  });

  it('should be lazy inited and cached', () => {
    const request_ = {socket: new Stream.Duplex()};
    request_.socket.remoteAddress = '127.0.0.2';
    const request = Request(request_);
    assert.strictEqual(request.ip, '127.0.0.2');
    request_.socket.remoteAddress = '127.0.0.1';
    assert.strictEqual(request.ip, '127.0.0.2');
  });

  it('should reset ip work', () => {
    const request_ = {socket: new Stream.Duplex()};
    request_.socket.remoteAddress = '127.0.0.2';
    const request = Request(request_);
    assert.strictEqual(request.ip, '127.0.0.2');
    request.ip = '127.0.0.1';
    assert.strictEqual(request.ip, '127.0.0.1');
  });
});
