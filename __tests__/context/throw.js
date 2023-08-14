'use strict';

const assert = require('node:assert');
const context = require('../../test-helpers/context');

describe('ctx.throw(msg)', () => {
  it('should set .status to 500', () => {
    const ctx = context();

    try {
      ctx.throw('boom');
    } catch (error) {
      assert.strictEqual(error.status, 500);
      assert.strictEqual(error.expose, false);
    }
  });
});

describe('ctx.throw(err)', () => {
  it('should set .status to 500', () => {
    const ctx = context();
    const error = new Error('test');

    try {
      ctx.throw(error);
    } catch (error) {
      assert.strictEqual(error.status, 500);
      assert.strictEqual(error.message, 'test');
      assert.strictEqual(error.expose, false);
    }
  });
});

describe('ctx.throw(err, status)', () => {
  it('should throw the error and set .status', () => {
    const ctx = context();
    const error = new Error('test');

    try {
      ctx.throw(error, 422);
    } catch (error_) {
      assert.strictEqual(error_.status, 422);
      assert.strictEqual(error_.message, 'test');
      assert.strictEqual(error_.expose, true);
    }
  });
});

describe('ctx.throw(status, err)', () => {
  it('should throw the error and set .status', () => {
    const ctx = context();
    const error = new Error('test');

    try {
      ctx.throw(422, error);
    } catch (error_) {
      assert.strictEqual(error_.status, 422);
      assert.strictEqual(error_.message, 'test');
      assert.strictEqual(error_.expose, true);
    }
  });
});

describe('ctx.throw(msg, status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw('name required', 400);
    } catch (error) {
      assert.strictEqual(error.message, 'name required');
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.expose, true);
    }
  });
});

describe('ctx.throw(status, msg)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw(400, 'name required');
    } catch (error) {
      assert.strictEqual(error.message, 'name required');
      assert.strictEqual(400, error.status);
      assert.strictEqual(true, error.expose);
    }
  });
});

describe('ctx.throw(status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    try {
      ctx.throw(400);
    } catch (error) {
      assert.strictEqual(error.message, 'Bad Request');
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.expose, true);
    }
  });

  describe('when not valid status', () => {
    it('should not expose', () => {
      const ctx = context();

      try {
        const error = new Error('some error');
        error.status = -1;
        ctx.throw(error);
      } catch (error) {
        assert.strictEqual(error.message, 'some error');
        assert.strictEqual(error.expose, false);
      }
    });
  });
});

describe('ctx.throw(status, msg, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(400, 'msg', {prop: true});
    } catch (error) {
      assert.strictEqual(error.message, 'msg');
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.expose, true);
      assert.strictEqual(error.prop, true);
    }
  });

  describe('when props include status', () => {
    it('should be ignored', () => {
      const ctx = context();

      try {
        ctx.throw(400, 'msg', {
          prop: true,
          status: -1,
        });
      } catch (error) {
        assert.strictEqual(error.message, 'msg');
        assert.strictEqual(error.status, 400);
        assert.strictEqual(error.expose, true);
        assert.strictEqual(error.prop, true);
      }
    });
  });
});

describe('ctx.throw(msg, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw('msg', {prop: true});
    } catch (error) {
      assert.strictEqual(error.message, 'msg');
      assert.strictEqual(error.status, 500);
      assert.strictEqual(error.expose, false);
      assert.strictEqual(error.prop, true);
    }
  });
});

describe('ctx.throw(status, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(400, {prop: true});
    } catch (error) {
      assert.strictEqual(error.message, 'Bad Request');
      assert.strictEqual(error.status, 400);
      assert.strictEqual(error.expose, true);
      assert.strictEqual(error.prop, true);
    }
  });
});

describe('ctx.throw(err, props)', () => {
  it('should mixin props', () => {
    const ctx = context();

    try {
      ctx.throw(new Error('test'), {prop: true});
    } catch (error) {
      assert.strictEqual(error.message, 'test');
      assert.strictEqual(error.status, 500);
      assert.strictEqual(error.expose, false);
      assert.strictEqual(error.prop, true);
    }
  });
});
