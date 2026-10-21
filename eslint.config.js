// Shared ESLint flat config for every workspace package (each package runs `eslint .`,
// which resolves this file from the repo root).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const { allowedPackages, forbiddenSpecifierRegex } = require('./scripts/import-boundary.cjs');

// Disguise import boundary, from packages/disguise-sdk/allowlist.json (scripts/check-imports.mjs
// enforces the same list in CI, including relative paths that leave the package).
const forbidden = forbiddenSpecifierRegex(allowedPackages());
const boundaryMessage =
  'A disguise may import only react, react-native, @inlay/disguise-sdk, @inlay/ui and packages in packages/disguise-sdk/allowlist.json.';

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      '.agent/**',
      '.claude/**',
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/ios/**',
      '**/android/**',
    ],
  },
  {
    files: ['disguises/**'],
    // Tests never ship and import the testkit; check-imports stops shipped files importing them.
    ignores: ['disguises/*/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: forbidden, caseSensitive: true, message: boundaryMessage }] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `CallExpression[callee.name="require"] > Literal[value=/${forbidden}/]`,
          message: boundaryMessage,
        },
        { selector: `ImportExpression > Literal[value=/${forbidden}/]`, message: boundaryMessage },
      ],
    },
  },
]);
