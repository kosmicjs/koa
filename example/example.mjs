import Koa from '../dist/esm/application.mjs';

const app = new Koa();

app.use(async (ctx) => {
  ctx.body = 'Hello World';
});
