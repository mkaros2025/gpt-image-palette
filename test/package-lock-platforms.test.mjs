import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockfile = JSON.parse(
  readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'),
);

const packageEntries = lockfile.packages ?? {};
const requiredEntries = [
  'node_modules/@esbuild/darwin-arm64',
  'node_modules/@esbuild/linux-x64',
  'node_modules/@img/sharp-darwin-arm64',
  'node_modules/@img/sharp-libvips-darwin-arm64',
  'node_modules/@img/sharp-libvips-linux-x64',
  'node_modules/@rollup/rollup-darwin-arm64',
  'node_modules/@rollup/rollup-linux-x64-gnu',
];

test('package-lock.json keeps native package entries for macOS and Linux', () => {
  for (const entry of requiredEntries) {
    assert.ok(packageEntries[entry], `missing lockfile entry: ${entry}`);
  }
});
