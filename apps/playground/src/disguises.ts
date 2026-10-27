import type { DisguiseManifest } from '@inlay/disguise-sdk';
import brief from '@inlay/disguise-brief';
import compress from '@inlay/disguise-compress';
import sudoku from '@inlay/disguise-sudoku';
import template from '@inlay/disguise-template';

/**
 * Every disguise the playground runs, one line each. Add yours here and add its package (and any
 * native modules it uses) to this app's `package.json`.
 */
export const disguises: readonly DisguiseManifest[] = [
  template, // _template
  compress, // compress
  sudoku, // sudoku
  brief, // brief
];
