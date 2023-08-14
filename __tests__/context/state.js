'use strict';

const assert = require('node:assert');
const request = require('supertest');
const Koa = require('../../dist/application');

describe('ctx.state', () => {
  it('should provide a ctx.state namespace', () => {
    const app = new Koa();

    app.use((ctx) => {
      assert.deepStrictEqual(ctx.state, {});
    });

    const server = app.listen();

    return request(server).get('/').expect(404);
  });
});
