// Shared ESLint flat config for every workspace package (each package runs `eslint .`,
// which resolves this file from the repo root).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

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
]);
