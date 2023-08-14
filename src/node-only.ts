function only(object: any, keys: string | string[]) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  object = object || {};
  if (typeof keys === 'string') keys = keys.split(/ +/);

  return keys.reduce<Record<string, unknown>>(function (returnValue, key) {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (object[key] == null) return returnValue;
    returnValue[key] = object[key];
    return returnValue;
  }, {});
}

export default only;
