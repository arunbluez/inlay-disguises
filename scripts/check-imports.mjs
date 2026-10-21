#!/usr/bin/env node
// Import boundary for disguises (PRD E02 req. 4). Every package under disguises/ may import only
// react, react-native, @inlay/disguise-sdk, @inlay/ui, packages in
// packages/disguise-sdk/allowlist.json (subpaths included) and relative paths inside the package.
// Its package.json dependencies, peerDependencies and optionalDependencies must be on the same
// list (devDependencies are build tooling and never ship). Tests in `__tests__/` are build tooling
// too: they may import the testkit and test libraries, and no shipped file may import them.
// Prints `file:line specifier` per hit and exits 1.
//
// Usage: node scripts/check-imports.mjs [--root <repo root>]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import ts from 'typescript';
import boundary from './import-boundary.cjs';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const TESTS_DIR = '__tests__';
const SKIPPED_DIRS = new Set(['node_modules', TESTS_DIR]);

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : sourceFiles(full);
    return entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

/** Every module specifier in a file: import/export … from, import x = require(), require(), import() and import('x') types. */
function specifiers(file) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const found = [];
  const add = (node) =>
    found.push({
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      // A computed require()/import() argument cannot be checked, so it is a hit on its own.
      specifier: ts.isStringLiteralLike(node) ? node.text : `<non-literal ${node.getText(source)}>`,
    });
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      add(node.moduleSpecifier);
    } else if (ts.isExternalModuleReference(node)) {
      add(node.expression);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node.argument.literal);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0]
    ) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function isAllowed(specifier, file, packageDir, allowed) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const target = path.relative(packageDir, path.resolve(path.dirname(file), specifier));
    return (
      !target.startsWith('..') &&
      !path.isAbsolute(target) &&
      !target.split(path.sep).includes(TESTS_DIR)
    );
  }
  return boundary.isAllowedPackage(specifier, allowed);
}

function checkImports(root) {
  const allowed = boundary.allowedPackages(root);
  const disguisesDir = path.join(root, 'disguises');
  const hits = [];
  let fileCount = 0;
  const packageDirs = fs
    .readdirSync(disguisesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(disguisesDir, entry.name));

  for (const packageDir of packageDirs) {
    const manifestPath = path.join(packageDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const text = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(text);
      for (const field of DEPENDENCY_FIELDS) {
        for (const name of Object.keys(manifest[field] ?? {})) {
          if (boundary.isAllowedPackage(name, allowed)) continue;
          const line = text.split('\n').findIndex((l) => l.includes(`"${name}"`)) + 1;
          hits.push({ file: manifestPath, line, specifier: `${name} (${field})` });
        }
      }
    }
    for (const file of sourceFiles(packageDir)) {
      fileCount += 1;
      for (const { line, specifier } of specifiers(file)) {
        if (!isAllowed(specifier, file, packageDir, allowed)) hits.push({ file, line, specifier });
      }
    }
  }
  return { hits, packageCount: packageDirs.length, fileCount };
}

const { values } = parseArgs({ options: { root: { type: 'string' } } });
const root = path.resolve(values.root ?? path.join(import.meta.dirname, '..'));
const { hits, packageCount, fileCount } = checkImports(root);
for (const hit of hits) {
  console.error(`${path.relative(root, hit.file)}:${hit.line} ${hit.specifier}`);
}
if (hits.length > 0) {
  console.error(
    `check-imports: ${hits.length} import(s) outside the disguise boundary. Allowed: ` +
      `${boundary.allowedPackages(root).join(', ')}, and relative paths inside the package.`,
  );
  process.exit(1);
}
console.log(`check-imports: ${packageCount} disguise(s), ${fileCount} source file(s) OK`);
