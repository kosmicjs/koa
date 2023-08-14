'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.protocol', () => {
  describe('when encrypted', () => {
    it('should return "https"', () => {
      const request_ = request();
      request_.req.socket = {encrypted: true};
      assert.strictEqual(request_.protocol, 'https');
    });
  });

  describe('when unencrypted', () => {
    it('should return "http"', () => {
      const request_ = request();
      request_.req.socket = {};
      assert.strictEqual(request_.protocol, 'http');
    });
  });

  describe('when X-Forwarded-Proto is set', () => {
    describe('and proxy is trusted', () => {
      it('should be used', () => {
        const request_ = request();
        request_.app.proxy = true;
        request_.req.socket = {};
        request_.header['x-forwarded-proto'] = 'https, http';
        assert.strictEqual(request_.protocol, 'https');
      });

      describe('and X-Forwarded-Proto is empty', () => {
        it('should return "http"', () => {
          const request_ = request();
          request_.app.proxy = true;
          request_.req.socket = {};
          request_.header['x-forwarded-proto'] = '';
          assert.strictEqual(request_.protocol, 'http');
        });
      });
    });

    describe('and proxy is not trusted', () => {
      it('should not be used', () => {
        const request_ = request();
        request_.req.socket = {};
        request_.header['x-forwarded-proto'] = 'https, http';
        assert.strictEqual(request_.protocol, 'http');
      });
    });
  });
});
