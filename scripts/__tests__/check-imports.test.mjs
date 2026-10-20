// Fixture tests for scripts/check-imports.mjs and the `disguises/**` ESLint block. Each case runs
// the real CLI (or ESLint) and logs its output so a failure shows what the guard printed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ESLint } from 'eslint';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'check-imports.mjs');
const ALLOWLIST = path.join(REPO_ROOT, 'packages', 'disguise-sdk', 'allowlist.json');
const tempRoots = [];

function run(args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  console.log(
    `$ check-imports ${args.join(' ')}\nexit ${result.status}\n${result.stdout}${result.stderr}`,
  );
  return result;
}

/** A throwaway repo root with the real allowlist and the given files (path → content). */
function fixtureRoot(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-imports-'));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, 'packages', 'disguise-sdk'), { recursive: true });
  fs.copyFileSync(ALLOWLIST, path.join(root, 'packages', 'disguise-sdk', 'allowlist.json'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
}

after(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

describe('check-imports', () => {
  test('the current tree passes', () => {
    const result = run([]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /OK/);
  });

  test('_template passes on its own', () => {
    const root = fixtureRoot({});
    fs.cpSync(
      path.join(REPO_ROOT, 'disguises', '_template'),
      path.join(root, 'disguises', '_template'),
      {
        recursive: true,
        filter: (source) => path.basename(source) !== 'node_modules',
      },
    );
    const result = run(['--root', root]);
    assert.equal(result.status, 0);
  });

  test('a disguise importing expo-file-system fails (PRD gate)', () => {
    const root = fixtureRoot({
      'disguises/leaky/package.json': JSON.stringify(
        { name: 'leaky', dependencies: { 'expo-file-system': '*', '@inlay/disguise-sdk': '*' } },
        null,
        2,
      ),
      'disguises/leaky/src/index.tsx': [
        "import * as FileSystem from 'expo-file-system';",
        "import { View } from 'react-native';",
        'export default [FileSystem, View];',
      ].join('\n'),
    });
    const result = run(['--root', root]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/leaky\/src\/index\.tsx:1 expo-file-system$/m);
    assert.match(
      result.stderr,
      /^disguises\/leaky\/package\.json:4 expo-file-system \(dependencies\)$/m,
    );
    const hitLines = result.stderr.split('\n').filter((line) => line.startsWith('disguises/'));
    assert.equal(hitLines.length, 2, 'react-native and @inlay/disguise-sdk are allowed');
  });

  test('every import form is checked; allowed packages, subpaths and inside paths pass', () => {
    const root = fixtureRoot({
      'disguises/forms/package.json': JSON.stringify({ name: 'forms' }),
      'disguises/forms/src/util.ts': 'export const n = 1;',
      'disguises/forms/src/index.tsx': [
        "import React from 'react';", // 1 allowed
        "import { Text } from 'react-native/Libraries/Text/Text';", // 2 allowed subpath
        "import { Button } from '@inlay/ui';", // 3 allowed
        "import { n } from './util';", // 4 inside the package
        "import * as ImagePicker from 'expo-image-picker';", // 5 allowlist.json
        "export { a } from 'lodash';", // 6 hit
        "export * from 'expo-crypto';", // 7 hit
        "const b = require('expo-file-system/legacy');", // 8 hit (subpath of a banned package)
        "const c = import('expo-secure-store');", // 9 hit
        "const d = require('../../outside');", // 10 hit (leaves the package)
        'const name = "expo-" + "sqlite";', // 11
        'const e = require(name);', // 12 hit (non-literal)
        "type F = typeof import('expo-file-system');", // 13 hit
        "import G = require('react-native-mmkv');", // 14 hit
        'export default [React, Text, Button, n, ImagePicker, b, c, d, e];',
      ].join('\n'),
    });
    const result = run(['--root', root]);
    assert.equal(result.status, 1);
    const lines = result.stderr
      .split('\n')
      .filter((line) => line.startsWith('disguises/'))
      .map((line) => line.replace('disguises/forms/src/index.tsx:', ''));
    assert.deepEqual(lines, [
      '6 lodash',
      '7 expo-crypto',
      '8 expo-file-system/legacy',
      '9 expo-secure-store',
      '10 ../../outside',
      '12 <non-literal name>',
      '13 expo-file-system',
      '14 react-native-mmkv',
    ]);
  });
});

describe('ESLint disguise block (built from the same allowlist.json)', () => {
  test('flags a banned import, require() and import() in disguises/**', async () => {
    const eslint = new ESLint({ cwd: REPO_ROOT });
    const code = [
      "import * as FileSystem from 'expo-file-system';",
      "import { View } from 'react-native';",
      "import { useTrigger } from '@inlay/disguise-sdk';",
      "const legacy = require('expo-file-system/legacy');",
      "const crypto = import('expo-crypto');",
      'export default [FileSystem, View, useTrigger, legacy, crypto];',
    ].join('\n');
    const [result] = await eslint.lintText(code, {
      filePath: path.join(REPO_ROOT, 'disguises', '_template', 'src', 'fixture.tsx'),
    });
    const boundary = result.messages
      .filter((m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-syntax')
      .map((m) => `${m.line} ${m.ruleId}`);
    console.log('ESLint boundary messages:', boundary);
    assert.deepEqual(boundary, [
      '1 no-restricted-imports',
      '4 no-restricted-syntax',
      '5 no-restricted-syntax',
    ]);
  });
});
