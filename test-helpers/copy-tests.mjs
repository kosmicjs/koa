/* eslint-disable no-await-in-loop */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {$} from 'execa';
import tempDir from 'temp-dir';

// const KOA_REPO_URL = 'https://github.com/koajs/koa.git';

const $$ = $({stdio: 'inherit'});

await $$`rm -rf __tests__`;
// await $$`rm -rf ${tempDir}/koa`;

// await $({cwd: tempDir, stdio: 'inherit'})`git clone ${KOA_REPO_URL}`;

await $$`cp -r ${tempDir}/koa/__tests__ .`;

const files = await fs.readdir(`__tests__`, {recursive: true});

const fileRoot = path.join(process.cwd(), '__tests__');

for (const file of files) {
  if (file.endsWith('.js')) {
    const content = await fs.readFile(path.join(fileRoot, file), 'utf8');
    const editedContent = content
      .replaceAll(/require\('\.\.\/?'\)/g, "require('..')")
      .replaceAll(/require\('\.\.\/\.\.\/?'\)/g, "require('../..')")
      .replaceAll(
        "require('../../lib/context')",
        "require('../../dist/context')",
      );
    await fs.writeFile(path.join(fileRoot, file), editedContent);
  }
}
