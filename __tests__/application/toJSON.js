'use strict';

const assert = require('node:assert');
const Koa = require('../../dist/application');

describe('app.toJSON()', () => {
  it('should work', () => {
    const app = new Koa();
    const object = app.toJSON();

    assert.deepStrictEqual(
      {
        subdomainOffset: 2,
        proxy: false,
        env: 'test',
      },
      object,
    );
  });
});
