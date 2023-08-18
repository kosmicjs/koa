import Application from '../src/application';

const app = new Application();

declare module '../src/application' {
  interface Context {
    whatevs: () => string;
  }
}

console.log(app);

app.use(async (ctx) => {
  console.log(ctx.whatevs());
});

app.listen(3000);
