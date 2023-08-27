/* eslint-disable no-await-in-loop */
import {readFile, readdir, writeFile} from 'node:fs/promises';
import url from 'node:url';
import path from 'node:path';

const files = await readdir('dist/esm');
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

console.log('running ');

for (const file of files) {
  if (!file.endsWith('.mjs')) continue;
  const fp = path.join(__dirname, '..', 'dist', 'esm', file);
  console.log('file', fp);
  const fileContents = await readFile(fp, 'utf8');
  const contentsArr = fileContents.split('/* -- EXPORTS -- */');
  const newContents = contentsArr[0] + contentsArr[2];
  if (contentsArr.length > 1) {
    await writeFile(fp, newContents);
    console.log(' wrote file success');
  }
}
