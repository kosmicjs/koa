import mimeTypes from 'mime-types';
import LRU from 'ylru';

const typeLRUCache = new LRU(100);

const cacheable = (type: string) => {
  let mimeType: string | boolean | undefined = typeLRUCache.get<string>(type);
  if (!mimeType) {
    mimeType = mimeTypes.contentType(type);
    typeLRUCache.set(type, mimeType);
  }

  return mimeType;
};

export default cacheable;
