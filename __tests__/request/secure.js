'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.secure', () => {
  it('should return true when encrypted', () => {
    const request_ = request();
    request_.req.socket = {encrypted: true};
    assert.strictEqual(request_.secure, true);
  });
});
