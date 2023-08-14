'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('req.host', () => {
  it('should return host with port', () => {
    const request_ = request();
    request_.header.host = 'foo.com:3000';
    assert.strictEqual(request_.host, 'foo.com:3000');
  });

  describe('with no host present', () => {
    it('should return ""', () => {
      const request_ = request();
      assert.strictEqual(request_.host, '');
    });
  });

  describe('when less then HTTP/2', () => {
    it('should not use :authority header', () => {
      const request_ = request({
        httpVersionMajor: 1,
        httpVersion: '1.1',
      });
      request_.header[':authority'] = 'foo.com:3000';
      request_.header.host = 'bar.com:8000';
      assert.strictEqual(request_.host, 'bar.com:8000');
    });
  });

  describe('when HTTP/2', () => {
    it('should use :authority header', () => {
      const request_ = request({
        httpVersionMajor: 2,
        httpVersion: '2.0',
      });
      request_.header[':authority'] = 'foo.com:3000';
      request_.header.host = 'bar.com:8000';
      assert.strictEqual(request_.host, 'foo.com:3000');
    });

    it('should use host header as fallback', () => {
      const request_ = request({
        httpVersionMajor: 2,
        httpVersion: '2.0',
      });
      request_.header.host = 'bar.com:8000';
      assert.strictEqual(request_.host, 'bar.com:8000');
    });
  });

  describe('when X-Forwarded-Host is present', () => {
    describe('and proxy is not trusted', () => {
      it('should be ignored on HTTP/1', () => {
        const request_ = request();
        request_.header['x-forwarded-host'] = 'bar.com';
        request_.header.host = 'foo.com';
        assert.strictEqual(request_.host, 'foo.com');
      });

      it('should be ignored on HTTP/2', () => {
        const request_ = request({
          httpVersionMajor: 2,
          httpVersion: '2.0',
        });
        request_.header['x-forwarded-host'] = 'proxy.com:8080';
        request_.header[':authority'] = 'foo.com:3000';
        request_.header.host = 'bar.com:8000';
        assert.strictEqual(request_.host, 'foo.com:3000');
      });
    });

    describe('and proxy is trusted', () => {
      it('should be used on HTTP/1', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.header['x-forwarded-host'] = 'bar.com, baz.com';
        request_.header.host = 'foo.com';
        assert.strictEqual(request_.host, 'bar.com');
      });

      it('should be used on HTTP/2', () => {
        const request_ = request({
          httpVersionMajor: 2,
          httpVersion: '2.0',
        });
        request_.app.proxy = true;
        request_.header['x-forwarded-host'] = 'proxy.com:8080';
        request_.header[':authority'] = 'foo.com:3000';
        request_.header.host = 'bar.com:8000';
        assert.strictEqual(request_.host, 'proxy.com:8080');
      });
    });
  });
});
