declare module 'only' {
  type only = (object: unknown, keys: string | string[]) => unknown;

  export default only;
}
