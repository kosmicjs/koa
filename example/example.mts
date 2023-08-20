import Application from '../dist/esm/application.mjs';

const app = new Application();

declare module '../dist/esm/application.mjs' {
  interface Context {
    whatevs: () => string;
  }

  interface State {
    foo: string;
  }
}

console.log(app);

const api = async () => ({test: 'json'});

app.use(async (ctx, next) => {
  console.log(ctx.whatevs());
  ctx.state.foo = 'bar';
  await next();
});

app.listen(3000);
