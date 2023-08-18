import {type Context} from './context.types';

export type Next<R = unknown> = () => Promise<R>;

export type Middleware<R = unknown, NR = unknown> = (
  context: Context,
  next: Next<NR>,
) => Promise<R>;

/**
 * Expose compositor
 *
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 */

function compose(middleware: Middleware[]) {
  if (!Array.isArray(middleware))
    throw new TypeError('Middleware stack must be an array!');
  for (const fn of middleware) {
    if (typeof fn !== 'function')
      throw new TypeError('Middleware must be composed of functions!');
  }

  return function (context: Context, next?: Next) {
    // last called middleware #
    let index = -1;
    return dispatch(0);
    function dispatch(i: number): Promise<unknown> {
      if (i <= index) Promise.reject(new Error('next() called multiple times'));
      index = i;
      let fn: Middleware | undefined = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    }
  };
}

export default compose;
module.exports.default = compose;
module.exports = compose;
