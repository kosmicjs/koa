import Application from '../dist/cjs/application.js';

const app = new Application();

declare module '../dist/cjs/application' {
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
  ctx.state.foo = 'bar';
  await next();
});

app.listen(3000);
