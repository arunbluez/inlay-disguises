// The disguise import boundary, read from packages/disguise-sdk/allowlist.json. Both
// scripts/check-imports.mjs and the `disguises/**` block in eslint.config.js use it, so the list
// lives in one place.
/* global __dirname -- Node CommonJS module */
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

/** Package names a disguise may depend on and import (react, react-native, the SDK, the UI kit and the allowlist). */
function allowedPackages(root = REPO_ROOT) {
  const file = path.join(root, 'packages', 'disguise-sdk', 'allowlist.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).packages.map((entry) => entry.name);
}

/** `@scope/name/sub/path` → `@scope/name`; `name/sub/path` → `name`. */
function packageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isAllowedPackage(specifier, allowed) {
  return allowed.includes(packageName(specifier));
}

/**
 * Regex source that matches any bare specifier outside `allowed` (subpaths of allowed packages
 * pass). Relative specifiers pass here; check-imports also checks that they stay inside the
 * package. `/` is written as `\x2F` so the source also works inside an ESLint selector regex.
 */
function forbiddenSpecifierRegex(allowed) {
  const names = allowed
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\x2F'))
    .join('|');
  return `^(?!\\.{1,2}(?:\\x2F|$))(?!(?:${names})(?:\\x2F|$))`;
}

module.exports = { allowedPackages, isAllowedPackage, forbiddenSpecifierRegex };
