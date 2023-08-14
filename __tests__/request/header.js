'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.header', () => {
  it('should return the request header object', () => {
    const request_ = request();
    assert.deepStrictEqual(request_.header, request_.req.headers);
  });

  it('should set the request header object', () => {
    const request_ = request();
    request_.header = {
      'X-Custom-Headerfield': 'Its one header, with headerfields',
    };
    assert.deepStrictEqual(request_.header, request_.req.headers);
  });
});
