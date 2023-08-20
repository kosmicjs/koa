import App from '../src/application';

const app = new App();

app.proxy = true;
app.subdomainOffset = 2;

app.use(async (ctx, next) => {
  console.log(ctx);
});
