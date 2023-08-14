'use strict';

const request = require('../../test-helpers/context').request;
const assert = require('node:assert');
const util = require('node:util');

describe('req.inspect()', () => {
  describe('with no request.req present', () => {
    it('should return null', () => {
      const request_ = request();
      request_.method = 'GET';
      delete request_.req;
      assert(undefined === request_.inspect());
      assert(util.inspect(request_) === 'undefined');
    });
  });

  it('should return a json representation', () => {
    const request_ = request();
    request_.method = 'GET';
    request_.url = 'example.com';
    request_.header.host = 'example.com';

    const expected = {
      method: 'GET',
      url: 'example.com',
      header: {
        host: 'example.com',
      },
    };

    assert.deepStrictEqual(request_.inspect(), expected);
    assert.deepStrictEqual(util.inspect(request_), util.inspect(expected));
  });
});
