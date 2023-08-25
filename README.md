# @kosmic/koa

### A strongly typed Koa drop in replacement

`@kosmic/koa` is a typescript first drop in replacement for [koa](https://koajs.com/). There are virtually 0 differences in the js code base and tests are run against the original `koa` tests as well as additional tests to ensure that `@kosmic/koa` is 100% production ready and directly compatible with the latest version of `koa`. Koa is very stable and is only updated infrequently, but we use github actions to closely track any changes that may occur.
In addition, it is very easy to use `@kosmic/koa` with any third party types as well, and no breaking changes should occur, at all, ever.

### Why do this?

- Much better, seamless, and stronger TS experience in every aspect.
- Types designed specifically for great intellisense with ts server.
  - easily see and validate any type on any object
  - Full koa documentation and examples on _every_ getter,setter,method, and property on any koa object!!!!! Never check the koa docs again!
- Less packages to install and worry about when using koa with typescript.

### I'm just using koa with JS - I don't need @kosmic/koa

Wait! If you use ts-server (ie, most code editors are using this), you can immediately benefit from awesome intellisense, even in pure JavaScript!! Once again, never check the docs again for you Koa questions, its right there in your editor!

### How to use

#### Step 1

Remove both `koa` and `@types/koa` from your package.json and then install `@kosmic/koa` and alias it to `koa`.

`npm install @kosmic/koa@npm:koa`

or

`yarn add @kosmic/koa@npm:koa`
or
`pnpm add @kosmic/koa@npm:koa`

Thats it!

You will now experience Koa with all the power of typescript _built in_.

#### A note on compatibility

`@kosmic/koa` mimics the types in `@types/koa`, however, they are not compatible. Third party types can extend them both the same way. In this way, if you want to use any existing koa module with third party types, you can easily do so, but your project needs to alias `@kosmic/koa` as `koa`.

This aliasing tends to work out of the box if you are using `npm` as a package manager, however, `yarn` and `pnpm` may require some extra configuration. The main ideas is that your project should see and use `@kosmic/koa` anywhere it tries to use `koa`.
