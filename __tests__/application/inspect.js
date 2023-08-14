'use strict';

const assert = require('node:assert');
const util = require('node:util');
const Koa = require('../../dist/application');

const app = new Koa();

describe('app.inspect()', () => {
  it('should work', () => {
    const string_ = util.inspect(app);
    assert.strictEqual(
      "{ subdomainOffset: 2, proxy: false, env: 'test' }",
      string_,
    );
  });

  it('should return a json representation', () => {
    assert.deepStrictEqual(
      {subdomainOffset: 2, proxy: false, env: 'test'},
      app.inspect(),
    );
  });
});
