'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.headers', () => {
  it('should return the request header object', () => {
    const request_ = request();
    assert.deepStrictEqual(request_.headers, request_.req.headers);
  });

  it('should set the request header object', () => {
    const request_ = request();
    request_.headers = {
      'X-Custom-Headerfield': 'Its one header, with headerfields',
    };
    assert.deepStrictEqual(request_.headers, request_.req.headers);
  });
});
