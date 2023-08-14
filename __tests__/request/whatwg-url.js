'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('req.URL', () => {
  it('should not throw when host is void', () => {
    // Accessing the URL should not throw.
    request().URL;
  });

  it('should not throw when header.host is invalid', () => {
    const request_ = request();
    request_.header.host = 'invalid host';
    // Accessing the URL should not throw.
    request_.URL;
  });

  it('should return empty object when invalid', () => {
    const request_ = request();
    request_.header.host = 'invalid host';
    assert.deepStrictEqual(request_.URL, Object.create(null));
  });
});
