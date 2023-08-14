'use strict';

const assert = require('node:assert');
const response = require('../../test-helpers/context').response;
const Stream = require('node:stream');

describe('res.socket', () => {
  it('should return the request socket object', () => {
    const res = response();
    assert.strictEqual(res.socket instanceof Stream, true);
  });
});
