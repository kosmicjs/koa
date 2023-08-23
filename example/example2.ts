import App from '../src/application';

const app = new App();

app.proxy = true;
app.subdomainOffset = 2;

app.use(async (ctx, next) => {
  console.log(ctx);
});

app.use(async (ctx, next) => {
  console.log(ctx.toJSON());
  await next();
});

app.use(async (ctx, next) => {
  ctx.body = 'Hello World';
});

console.log(app.listenerCount);
console.log(app.inspect());

app.listen(3000, () => {
  console.log('listening on 3000');
});
