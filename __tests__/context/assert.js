'use strict';

const assert = require('node:assert');
const context = require('../../test-helpers/context');

describe('ctx.assert(value, status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.assert(false, 404);
      throw new Error('asdf');
    } catch (error) {
      assert.strictEqual(error.status, 404);
      assert.strictEqual(error.expose, true);
    }
  });
});
