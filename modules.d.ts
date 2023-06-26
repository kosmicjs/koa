declare module 'only' {
  type only = (obj: unknown, keys: string | string[]) => unknown;

  export default only;
}
