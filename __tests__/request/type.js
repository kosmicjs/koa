'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('req.type', () => {
  it('should return type void of parameters', () => {
    const request_ = request();
    request_.header['content-type'] = 'text/html; charset=utf-8';
    assert.strictEqual(request_.type, 'text/html');
  });

  it('should return empty string with no host present', () => {
    const request_ = request();
    assert.strictEqual(request_.type, '');
  });
});
