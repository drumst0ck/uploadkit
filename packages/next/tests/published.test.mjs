import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const tsupRequire = createRequire(require.resolve('tsup'));
const { build } = tsupRequire('esbuild');

test('published CJS and ESM keep the synchronous helper export and real component identity', async () => {
  const cjs = require('../dist/index.js');
  const esm = await import('../dist/index.mjs');
  const reactCjs = require('@uploadkitdev/react/helpers');
  const reactEsm = await import('@uploadkitdev/react/helpers');
  for (const [sdk, react] of [[cjs, reactCjs], [esm, reactEsm]]) {
    const helpers = sdk.generateReactHelpers();
    const actual = react.generateReactHelpers();
    for (const key of ['UploadButton', 'UploadDropzone', 'UploadModal', 'useUploadKit']) assert.equal(helpers[key], actual[key]);
    assert.equal(typeof sdk.createUploadKitHandler, 'function');
  }
});
test('published client boundaries survive bundling and browser resolution excludes server storage', async () => {
  for (const path of ['../dist/helpers.mjs', '../dist/helpers.js', '../dist/browser.mjs', '../../react/dist/helpers.mjs', '../../react/dist/index.mjs']) {
    assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /^['"]use client['"];?/);
  }
  const bundle = await build({
    stdin: { contents: "import { generateReactHelpers } from '@uploadkitdev/next'; export const helpers = generateReactHelpers();", resolveDir: new URL('..', import.meta.url).pathname },
    bundle: true, platform: 'browser', format: 'esm', write: false, metafile: true, logLevel: 'silent',
  });
  const inputs = Object.keys(bundle.metafile.inputs).join('\n');
  assert.doesNotMatch(inputs, /@aws-sdk|upload-grant|handler\.(?:mjs|js)|byos\.(?:mjs|js)/);
  assert.doesNotMatch(bundle.outputFiles[0].text, /node:crypto|secretAccessKey/);
});
test('fresh React build emits the CSS declared in the public export', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../react/package.json', import.meta.url), 'utf8'));
  const css = new URL(`../../react/${pkg.exports['./styles.css']}`, import.meta.url);
  assert.ok(existsSync(css));
  assert.match(readFileSync(css, 'utf8'), /--uk-primary/);
});
