'use strict';

const assert = require('node:assert');
const request = require('supertest');
const Koa = require('../../dist/application');
const context = require('../../test-helpers/context');

describe('ctx.onerror(err)', () => {
  it('should respond', () => {
    const app = new Koa();

    app.use((ctx, next) => {
      ctx.body = 'something else';

      ctx.throw(418, 'boom');
    });

    const server = app.listen();

    return request(server)
      .get('/')
      .expect(418)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Length', '4');
  });

  it('should unset all headers', async () => {
    const app = new Koa();

    app.use((ctx, next) => {
      ctx.set('Vary', 'Accept-Encoding');
      ctx.set('X-CSRF-Token', 'asdf');
      ctx.body = 'response';

      ctx.throw(418, 'boom');
    });

    const server = app.listen();

    const res = await request(server)
      .get('/')
      .expect(418)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Length', '4');

    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(res.headers, 'vary'),
      false,
    );
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(res.headers, 'x-csrf-token'),
      false,
    );
  });

  it('should set headers specified in the error', async () => {
    const app = new Koa();

    app.use((ctx, next) => {
      ctx.set('Vary', 'Accept-Encoding');
      ctx.set('X-CSRF-Token', 'asdf');
      ctx.body = 'response';

      throw Object.assign(new Error('boom'), {
        status: 418,
        expose: true,
        headers: {
          'X-New-Header': 'Value',
        },
      });
    });

    const server = app.listen();

    const res = await request(server)
      .get('/')
      .expect(418)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('X-New-Header', 'Value');

    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(res.headers, 'vary'),
      false,
    );
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(res.headers, 'x-csrf-token'),
      false,
    );
  });

  it('should ignore error after headerSent', (done) => {
    const app = new Koa();

    app.on('error', (error) => {
      assert.strictEqual(error.message, 'mock error');
      assert.strictEqual(error.headerSent, true);
      done();
    });

    app.use(async (ctx) => {
      ctx.status = 200;
      ctx.set('X-Foo', 'Bar');
      ctx.flushHeaders();
      await Promise.reject(new Error('mock error'));
      ctx.body = 'response';
    });

    request(app.callback())
      .get('/')
      .expect('X-Foo', 'Bar')
      .expect(200, () => {});
  });

  it('should set status specified in the error using statusCode', () => {
    const app = new Koa();

    app.use((ctx, next) => {
      ctx.body = 'something else';
      const error = new Error('Not found');
      error.statusCode = 404;
      throw error;
    });

    const server = app.listen();

    return request(server)
      .get('/')
      .expect(404)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Not Found');
  });

  describe('when invalid err.statusCode', () => {
    describe('not number', () => {
      it('should respond 500', () => {
        const app = new Koa();

        app.use((ctx, next) => {
          ctx.body = 'something else';
          const error = new Error('some error');
          error.statusCode = 'notnumber';
          throw error;
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect(500)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Internal Server Error');
      });
    });
  });

  describe('when invalid err.status', () => {
    describe('not number', () => {
      it('should respond 500', () => {
        const app = new Koa();

        app.use((ctx, next) => {
          ctx.body = 'something else';
          const error = new Error('some error');
          error.status = 'notnumber';
          throw error;
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect(500)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Internal Server Error');
      });
    });
    describe('when ENOENT error', () => {
      it('should respond 404', () => {
        const app = new Koa();

        app.use((ctx, next) => {
          ctx.body = 'something else';
          const error = new Error('test for ENOENT');
          error.code = 'ENOENT';
          throw error;
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect(404)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Not Found');
      });
    });
    describe('not http status code', () => {
      it('should respond 500', () => {
        const app = new Koa();

        app.use((ctx, next) => {
          ctx.body = 'something else';
          const error = new Error('some error');
          error.status = 9999;
          throw error;
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect(500)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Internal Server Error');
      });
    });
  });

  describe('when error from another scope thrown', () => {
    it('should handle it like a normal error', async () => {
      const ExternError = require('node:vm').runInNewContext('Error');

      const app = new Koa();
      const error = Object.assign(new ExternError('boom'), {
        status: 418,
        expose: true,
      });
      app.use((ctx, next) => {
        throw error;
      });

      const server = app.listen();

      const gotRightErrorPromise = new Promise((resolve, reject) => {
        app.on('error', (receivedError) => {
          try {
            assert.strictEqual(receivedError, error);
            resolve();
          } catch (error_) {
            reject(error_);
          }
        });
      });

      await request(server).get('/').expect(418);

      await gotRightErrorPromise;
    });
  });

  describe('when non-error thrown', () => {
    it('should respond with non-error thrown message', () => {
      const app = new Koa();

      app.use((ctx, next) => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });

      const server = app.listen();

      return request(server)
        .get('/')
        .expect(500)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('Internal Server Error');
    });

    it('should use res.getHeaderNames() accessor when available', () => {
      let removed = 0;
      const ctx = context();

      ctx.app.emit = () => {};
      ctx.res = {
        getHeaderNames: () => ['content-type', 'content-length'],
        removeHeader: () => removed++,
        end() {},
        emit() {},
      };

      ctx.onerror(new Error('error'));

      assert.strictEqual(removed, 2);
    });

    it('should stringify error if it is an object', (done) => {
      const app = new Koa();

      app.on('error', (error) => {
        assert.strictEqual(error.message, 'non-error thrown: {"key":"value"}');
        done();
      });

      app.use(async (ctx) => {
        throw {key: 'value'}; // eslint-disable-line no-throw-literal
      });

      request(app.callback())
        .get('/')
        .expect(500)
        .expect('Internal Server Error', () => {});
    });
  });
});
