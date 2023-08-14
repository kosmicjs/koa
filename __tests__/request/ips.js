'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.ips', () => {
  describe('when X-Forwarded-For is present', () => {
    describe('and proxy is not trusted', () => {
      it('should be ignored', () => {
        const request_ = request();
        request_.app.proxy = false;
        request_.header['x-forwarded-for'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, []);
      });
    });

    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.header['x-forwarded-for'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, ['127.0.0.1', '127.0.0.2']);
      });
    });
  });

  describe('when options.proxyIpHeader is present', () => {
    describe('and proxy is not trusted', () => {
      it('should be ignored', () => {
        const request_ = request();
        request_.app.proxy = false;
        request_.app.proxyIpHeader = 'x-client-ip';
        request_.header['x-client-ip'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, []);
      });
    });

    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.app.proxyIpHeader = 'x-client-ip';
        request_.header['x-client-ip'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, ['127.0.0.1', '127.0.0.2']);
      });
    });
  });

  describe('when options.maxIpsCount is present', () => {
    describe('and proxy is not trusted', () => {
      it('should be ignored', () => {
        const request_ = request();
        request_.app.proxy = false;
        request_.app.maxIpsCount = 1;
        request_.header['x-forwarded-for'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, []);
      });
    });

    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.app.maxIpsCount = 1;
        request_.header['x-forwarded-for'] = '127.0.0.1,127.0.0.2';
        assert.deepStrictEqual(request_.ips, ['127.0.0.2']);
      });
    });
  });
});
