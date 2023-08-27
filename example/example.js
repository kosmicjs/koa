const Koa = require('../dist/application.js');

const app = new Koa();

app.use(async (ctx) => {
  ctx.body = 'Hello World';
});
