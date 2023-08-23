import {type Context as KosmicContext} from './application.js';

declare module 'koa' {
  interface BaseContext extends KosmicContext {}
}
