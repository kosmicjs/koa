'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('ctx.idempotent', () => {
  describe('when the request method is idempotent', () => {
    it('should return true', () => {
      ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'].forEach(check);
      function check(method) {
        const request_ = request();
        request_.method = method;
        assert.strictEqual(request_.idempotent, true);
      }
    });
  });

  describe('when the request method is not idempotent', () => {
    it('should return false', () => {
      const request_ = request();
      request_.method = 'POST';
      assert.strictEqual(request_.idempotent, false);
    });
  });
});
