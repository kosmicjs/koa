'use strict';

const assert = require('node:assert');
const context = require('../../test-helpers/context');

describe('ctx.toJSON()', () => {
  it('should return a json representation', () => {
    const ctx = context();

    ctx.req.method = 'POST';
    ctx.req.url = '/items';
    ctx.req.headers['content-type'] = 'text/plain';
    ctx.status = 200;
    ctx.body = '<p>Hey</p>';

    const object = JSON.parse(JSON.stringify(ctx));
    const request = object.request;
    const res = object.response;

    assert.deepStrictEqual(
      {
        method: 'POST',
        url: '/items',
        header: {
          'content-type': 'text/plain',
        },
      },
      request,
    );

    assert.deepStrictEqual(
      {
        status: 200,
        message: 'OK',
        header: {
          'content-type': 'text/html; charset=utf-8',
          'content-length': '10',
        },
      },
      res,
    );
  });
});
