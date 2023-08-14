'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('req.charset', () => {
  describe('with no content-type present', () => {
    it('should return ""', () => {
      const request_ = request();
      assert(request_.charset === '');
    });
  });

  describe('with charset present', () => {
    it('should return ""', () => {
      const request_ = request();
      request_.header['content-type'] = 'text/plain';
      assert(request_.charset === '');
    });
  });

  describe('with a charset', () => {
    it('should return the charset', () => {
      const request_ = request();
      request_.header['content-type'] = 'text/plain; charset=utf-8';
      assert.strictEqual(request_.charset, 'utf-8');
    });

    it('should return "" if content-type is invalid', () => {
      const request_ = request();
      request_.header['content-type'] =
        'application/json; application/text; charset=utf-8';
      assert.strictEqual(request_.charset, '');
    });
  });
});
