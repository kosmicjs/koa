'use strict';

const assert = require('node:assert');
const Stream = require('node:stream');
const context = require('../../test-helpers/context');

describe('ctx.origin', () => {
  it('should return the origin of url', () => {
    const socket = new Stream.Duplex();
    const request = {
      url: '/users/1?next=/dashboard',
      headers: {
        host: 'localhost',
      },
      socket,
      __proto__: Stream.Readable.prototype,
    };
    const ctx = context(request);
    assert.strictEqual(ctx.origin, 'http://localhost');
    // change it also work
    ctx.url = '/foo/users/1?next=/dashboard';
    assert.strictEqual(ctx.origin, 'http://localhost');
  });
});
