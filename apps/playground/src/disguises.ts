import type { DisguiseManifest } from '@inlay-app/disguise-sdk';
import brief from '@inlay-app/disguise-brief';
import compress from '@inlay-app/disguise-compress';
import dial from '@inlay-app/disguise-dial';
import sudoku from '@inlay-app/disguise-sudoku';
import template from '@inlay-app/disguise-template';

/**
 * Every disguise the playground runs, one line each. Add yours here and add its package (and any
 * native modules it uses) to this app's `package.json`.
 */
export const disguises: readonly DisguiseManifest[] = [
  template, // _template
  compress, // compress
  sudoku, // sudoku
  brief, // brief
  dial, // dial
];
