function only(obj: any, keys: string | string[]) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  obj = obj || {};
  if (typeof keys === 'string') keys = keys.split(/ +/);
  // eslint-disable-next-line unicorn/no-array-reduce
  return keys.reduce<Record<string, unknown>>(function (ret, key) {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (obj[key] == null) return ret;
    ret[key] = obj[key];
    return ret;
  }, {});
}

export default only;
