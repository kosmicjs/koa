'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('req.hostname', () => {
  it('should return hostname void of port', () => {
    const request_ = request();
    request_.header.host = 'foo.com:3000';
    assert.strictEqual(request_.hostname, 'foo.com');
  });

  describe('with no host present', () => {
    it('should return ""', () => {
      const request_ = request();
      assert.strictEqual(request_.hostname, '');
    });
  });

  describe('with IPv6 in host', () => {
    it('should parse localhost void of port', () => {
      const request_ = request();
      request_.header.host = '[::1]';
      assert.strictEqual(request_.hostname, '[::1]');
    });

    it('should parse localhost with port 80', () => {
      const request_ = request();
      request_.header.host = '[::1]:80';
      assert.strictEqual(request_.hostname, '[::1]');
    });

    it('should parse localhost with non-special schema port', () => {
      const request_ = request();
      request_.header.host = '[::1]:1337';
      assert.strictEqual(request_.hostname, '[::1]');
    });

    it('should reduce IPv6 with non-special schema port as hostname', () => {
      const request_ = request();
      request_.header.host = '[2001:cdba:0000:0000:0000:0000:3257:9652]:1337';
      assert.strictEqual(request_.hostname, '[2001:cdba::3257:9652]');
    });

    it('should return empty string when invalid', () => {
      const request_ = request();
      request_.header.host = '[invalidIPv6]';
      assert.strictEqual(request_.hostname, '');
    });
  });

  describe('when X-Forwarded-Host is present', () => {
    describe('and proxy is not trusted', () => {
      it('should be ignored', () => {
        const request_ = request();
        request_.header['x-forwarded-host'] = 'bar.com';
        request_.header.host = 'foo.com';
        assert.strictEqual(request_.hostname, 'foo.com');
      });
    });

    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.header['x-forwarded-host'] = 'bar.com, baz.com';
        request_.header.host = 'foo.com';
        assert.strictEqual(request_.hostname, 'bar.com');
      });
    });
  });
});
