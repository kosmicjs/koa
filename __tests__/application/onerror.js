'use strict';

const assert = require('node:assert');
const Koa = require('../../dist/application');

describe('app.onerror(err)', () => {
  it('should throw an error if a non-error is given', () => {
    const app = new Koa();

    assert.throws(
      () => {
        app.onerror('foo');
      },
      TypeError,
      'non-error thrown: foo',
    );
  });

  it('should accept errors coming from other scopes', () => {
    const ExternError = require('node:vm').runInNewContext('Error');

    const app = new Koa();
    const error = Object.assign(new ExternError('boom'), {
      status: 418,
      expose: true,
    });

    assert.doesNotThrow(() => app.onerror(error));
  });

  it('should do nothing if status is 404', () => {
    const app = new Koa();
    const error = new Error();

    error.status = 404;

    const spy = jest.spyOn(console, 'error');
    app.onerror(error);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should do nothing if .silent', () => {
    const app = new Koa();
    app.silent = true;
    const error = new Error();

    const spy = jest.spyOn(console, 'error');
    app.onerror(error);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log the error to stderr', () => {
    const app = new Koa();
    app.env = 'dev';

    const error = new Error();
    error.stack = 'Foo';

    const spy = jest.spyOn(console, 'error');
    app.onerror(error);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
