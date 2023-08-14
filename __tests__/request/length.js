'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');

describe('ctx.length', () => {
  it('should return length in content-length', () => {
    const request_ = request();
    request_.header['content-length'] = '10';
    assert.strictEqual(request_.length, 10);
  });

  it('should return undefined with no content-length present', () => {
    const request_ = request();
    assert.strictEqual(request_.length, undefined);
  });
});
