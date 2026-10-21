// Fixture tests for scripts/check-words.mjs. Each case writes a small repo with its own config,
// runs the real CLI and logs what it printed. The repo's own check-words.allow.json is reused so
// the PRD gate cases go through the real seed entries.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'check-words.mjs');
const REPO_ALLOW = fs.readFileSync(path.join(REPO_ROOT, 'check-words.allow.json'), 'utf8');
const tempRoots = [];

function run(configFile) {
  const result = spawnSync(process.execPath, [SCRIPT, '--config', configFile], {
    encoding: 'utf8',
  });
  console.log(
    `$ check-words --config ${configFile}\nexit ${result.status}\n${result.stdout}${result.stderr}`,
  );
  return result;
}

/** A throwaway repo scanning `disguises/**`, with the given files and allow list (JSON text). */
function checkFixture(files, allow = REPO_ALLOW) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-words-'));
  tempRoots.push(root);
  const all = {
    'check-words.config.json': JSON.stringify({
      include: ['disguises/**'],
      allow: 'check-words.allow.json',
    }),
    'check-words.allow.json': allow,
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return run(path.join(root, 'check-words.config.json'));
}

/** A Compress-like screen with one string swapped in. */
const compressScreen = (label) => `import { StyleSheet, Text, View } from 'react-native';

export function Home() {
  return (
    <View style={styles.card}>
      <Text accessibilityLabel="Compress photos">${label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden' },
});
`;

const compressPackage = JSON.stringify(
  { name: '@inlay/disguise-compress', private: true, main: 'src/index.tsx' },
  null,
  2,
);

after(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

describe('check-words', () => {
  test('the current tree passes', () => {
    const result = run(path.join(REPO_ROOT, 'scripts', 'check-words.config.json'));
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stderr, /warning/);
  });

  test('a clean Compress screen passes, with overflow: hidden and "private": true allowed (PRD gate)', () => {
    const result = checkFixture({
      'disguises/compress/package.json': compressPackage,
      'disguises/compress/src/Home.tsx': compressScreen('Compress photos'),
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /2 file\(s\) scanned/);
  });

  test('"vault" in a Compress string fails (PRD gate)', () => {
    const result = checkFixture({
      'disguises/compress/package.json': compressPackage,
      'disguises/compress/src/Home.tsx': compressScreen('Open vault'),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/compress\/src\/Home\.tsx:6 "vault": .*Open vault/m);
  });

  test('without the seed entries, overflow: hidden and "private": true are reported', () => {
    const result = checkFixture(
      {
        'disguises/compress/package.json': compressPackage,
        'disguises/compress/src/Home.tsx': compressScreen('Compress photos'),
      },
      JSON.stringify([{ path: '**/node_modules', reason: 'third-party code' }]),
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/compress\/package\.json:3 "private"/m);
    assert.match(result.stderr, /^disguises\/compress\/src\/Home\.tsx:12 "hidden"/m);
  });

  test('identifiers, props, templates, words inside words and the domain are caught; comments are not', () => {
    const result = checkFixture({
      'disguises/compress/src/Settings.tsx': [
        "import { Keyboard, Text } from 'react-native';", // 1
        '// A comment may say vault; comments are not shown to anyone.', // 2
        'export function hideKeyboard() {', // 3 identifier (camelCase)
        '  Keyboard.dismiss();', // 4
        '}', // 5
        'const IS_SECRET_MODE = false;', // 6 identifier (snake case)
        'const status = `Achievement unlocked: ${IS_SECRET_MODE}`;', // 7 template text + identifier
        'export const Row = () => <Text placeholder="Private notes" testID="about-row">', // 8 string prop
        '  Visit inlayvault.com', // 9 JSX text, literal reported once
        '</Text>;', // 10
        'export const label = status;', // 11
      ].join('\n'),
    });
    assert.equal(result.status, 1);
    const hits = result.stderr
      .split('\n')
      .filter((line) => line.startsWith('disguises/'))
      .map((line) =>
        line.replace(/^disguises\/compress\/src\/Settings\.tsx:(\d+) ("[^"]+").*$/, '$1 $2'),
      );
    assert.deepEqual(hits, [
      '3 "hide"',
      '6 "secret"',
      '7 "locked"',
      '7 "secret"',
      '8 "private"',
      '9 "inlayvault.com"',
    ]);
  });

  test('file and directory names are checked', () => {
    const result = checkFixture({
      'disguises/compress/src/HiddenFiles.tsx': 'export const n = 1;',
      'disguises/compress/assets/vault/icon.png': 'not an image',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/compress\/assets\/vault \(name\) "vault"/m);
    assert.match(result.stderr, /^disguises\/compress\/src\/HiddenFiles\.tsx \(name\) "hidden"/m);
  });

  test('JSON strings files are scanned as text', () => {
    const result = checkFixture({
      'disguises/compress/i18n/en.json': JSON.stringify({ title: 'Locked files' }, null, 2),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/compress\/i18n\/en\.json:2 "locked"/m);
  });

  test('Markdown files are scanned as text', () => {
    const result = checkFixture({
      'disguises/compress/README.md': '# Compress\n\nShrink photos.\n\nKeeps files secret.\n',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^disguises\/compress\/README\.md:5 "secret"/m);
  });

  test('a bare-word allow entry is rejected', () => {
    const result = checkFixture(
      { 'disguises/compress/src/a.ts': "export const a = 'b';" },
      JSON.stringify([{ pattern: "'hidden'", reason: 'too broad' }]),
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is a bare word/);
  });

  test('an allow entry without a reason is rejected', () => {
    const result = checkFixture(
      { 'disguises/compress/src/a.ts': "export const a = 'b';" },
      JSON.stringify([{ pattern: "overflow: 'hidden'" }]),
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /needs a "reason"/);
  });

  test('a path-scoped pattern does not apply outside its path', () => {
    const result = checkFixture(
      { 'disguises/compress/src/a.ts': "export const config = { overflow: 'hidden' };" },
      JSON.stringify([{ pattern: "overflow: 'hidden'", path: '**/*.json', reason: 'json only' }]),
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /a\.ts:1 "hidden"/);
    assert.match(result.stderr, /warning: unused allow entry/);
  });

  test('an unused allow entry is a warning, not a failure', () => {
    const result = checkFixture(
      { 'disguises/compress/src/a.ts': "export const a = 'b';" },
      JSON.stringify([{ pattern: "backfaceVisibility: 'hidden'", reason: 'style value' }]),
    );
    assert.equal(result.status, 0);
    assert.match(result.stderr, /warning: unused allow entry .*backfaceVisibility/);
  });
});
