#!/usr/bin/env node
// Telltale-word guard for disguise surfaces (PRD E02 req. 5, D-32). A disguise and the UI kit it
// renders with must never hint at what they cover, so the words below may not appear in
// user-visible strings or identifiers. A word also counts inside a longer word or identifier
// ("unlocked", "hideKeyboard", "IS_HIDDEN"), case-insensitively.
//
// Scanned: TS/JS string literals, template text, JSX text and every identifier (components,
// props, style keys, config keys), whole JSON/XML/plist/.strings and Markdown files (public docs),
// and file and directory names. Comments are not scanned. A false positive is fixed with an
// exact-pattern entry in the allow file, never by dropping the style or the field (D-32).
//
// Usage: node check-words.mjs --config <file>
// Config (paths relative to the config file): { "root": "..", "include": ["<glob>", …], "allow": "<file>" }
//   root     directory every other path is relative to
//   include  globs of files to scan, e.g. "disguises/**"
//   allow    JSON array of { "pattern"?, "path"?, "reason" }:
//              pattern  exact text around the word, e.g. "overflow: 'hidden'"; never a bare word
//              path     glob for the file or any directory above it; alone, it skips that path
//              reason   why this is not a hint
// Exits 1 on a hit or an invalid allow entry; an allow entry that matched nothing is a warning.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const WORDS = ['vault', 'secret', 'hidden', 'private', 'locked', 'hide'];
const LITERALS = ['inlayvault.com'];
const TERMS = [...LITERALS, ...WORDS];

const SCRIPT_KINDS = {
  '.ts': ts.ScriptKind.TS,
  '.mts': ts.ScriptKind.TS,
  '.cts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
};
const TEXT_EXTENSIONS = new Set(['.json', '.xml', '.plist', '.strings', '.md']);
const SCANNED_KINDS = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PrivateIdentifier,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

function fail(message) {
  console.error(`check-words: ${message}`);
  process.exit(1);
}

/** Telltale terms in `text[from, to)`, as absolute ranges; a word inside a literal hit is not repeated. */
function findTerms(text, from = 0, to = text.length) {
  const lower = text.slice(from, to).toLowerCase();
  const hits = [];
  for (const term of TERMS) {
    for (let i = lower.indexOf(term); i !== -1; i = lower.indexOf(term, i + 1)) {
      const start = from + i;
      const end = start + term.length;
      if (!hits.some((hit) => hit.start <= start && end <= hit.end))
        hits.push({ term, start, end });
    }
  }
  return hits;
}

/** Ranges of string, template, JSX text and identifier tokens in a TS/JS file. */
function tokenRanges(file, text, kind) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const ranges = [];
  const visit = (node) => {
    if (SCANNED_KINDS.has(node.kind)) ranges.push([node.getStart(source), node.end]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return ranges;
}

function loadAllow(file) {
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(entries)) fail(`${file} must be a JSON array of allow entries`);
  return entries.map((entry, index) => {
    const where = `${path.basename(file)}[${index}]`;
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      fail(`${where} needs a "reason"`);
    }
    if (entry.pattern === undefined && entry.path === undefined) {
      fail(`${where} needs a "pattern" or a "path"`);
    }
    if (entry.pattern !== undefined) {
      const bare = entry.pattern.toLowerCase().replace(/[^a-z0-9.]/g, '');
      if (TERMS.includes(bare)) {
        fail(
          `${where} pattern ${JSON.stringify(entry.pattern)} is a bare word; give the exact text around it`,
        );
      }
    }
    return { ...entry, used: false };
  });
}

/** True when `rel` or a directory above it matches `glob`. */
function underGlob(rel, glob) {
  const parts = rel.split('/');
  return parts.some((_, i) => path.matchesGlob(parts.slice(0, i + 1).join('/'), glob));
}

function isAllowed(hit, text, rel, allow) {
  const entry = allow.find((candidate) => {
    if (candidate.pattern === undefined) return false;
    if (candidate.path !== undefined && !underGlob(rel, candidate.path)) return false;
    for (
      let i = text.indexOf(candidate.pattern);
      i !== -1;
      i = text.indexOf(candidate.pattern, i + 1)
    ) {
      if (i <= hit.start && hit.end <= i + candidate.pattern.length) return true;
    }
    return false;
  });
  if (entry) entry.used = true;
  return entry !== undefined;
}

function lineAt(text, offset) {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEnd = text.indexOf('\n', offset);
  return { line, excerpt: text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim() };
}

/** `rel` and everything below it (relative to root), skipping paths a path-only allow entry covers. */
function* walk(root, rel, allow) {
  const skip = allow.find((a) => a.pattern === undefined && path.matchesGlob(rel, a.path));
  if (skip) {
    skip.used = true;
    return;
  }
  const stat = fs.lstatSync(path.join(root, rel));
  if (stat.isFile()) {
    yield { rel, isFile: true };
  } else if (stat.isDirectory()) {
    yield { rel, isFile: false };
    for (const name of fs.readdirSync(path.join(root, rel))) {
      yield* walk(root, rel === '' ? name : `${rel}/${name}`, allow);
    }
  }
}

/** The fixed path a glob starts at, e.g. `packages/ui/**` → `packages/ui`, `app.json` → `app.json`. */
function globBase(glob) {
  const parts = glob.split('/');
  const firstMagic = parts.findIndex((part) => /[*?[\]{}]/.test(part));
  return firstMagic === -1 ? glob : parts.slice(0, firstMagic).join('/');
}

function checkWords(configFile) {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const configDir = path.dirname(configFile);
  const root = path.resolve(configDir, config.root ?? '.');
  if (!Array.isArray(config.include) || config.include.length === 0) {
    fail(`${configFile} needs an "include" list of globs`);
  }
  const allowFile = path.resolve(configDir, config.allow);
  const allow = loadAllow(allowFile);
  const hits = [];
  const seen = new Set();
  let fileCount = 0;

  for (const base of new Set(config.include.map(globBase))) {
    if (!fs.existsSync(path.join(root, base))) continue;
    for (const { rel, isFile } of walk(root, base, allow)) {
      if (seen.has(rel) || !config.include.some((glob) => path.matchesGlob(rel, glob))) continue;
      seen.add(rel);

      // File and directory names.
      const nameStart = rel.length - path.basename(rel).length;
      for (const hit of findTerms(rel, nameStart)) {
        if (!isAllowed(hit, rel, rel, allow))
          hits.push({ rel, line: 0, term: hit.term, excerpt: rel });
      }
      if (!isFile) continue;

      const ext = path.extname(rel);
      const kind = SCRIPT_KINDS[ext];
      if (kind === undefined && !TEXT_EXTENSIONS.has(ext)) continue;
      fileCount += 1;
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      const ranges = kind === undefined ? [[0, text.length]] : tokenRanges(rel, text, kind);
      for (const [from, to] of ranges) {
        for (const hit of findTerms(text, from, to)) {
          if (!isAllowed(hit, text, rel, allow))
            hits.push({ rel, term: hit.term, ...lineAt(text, hit.start) });
        }
      }
    }
  }
  const shownAllowFile = path.relative(process.cwd(), allowFile);
  return {
    hits,
    allow,
    allowFile: shownAllowFile.startsWith('..') ? allowFile : shownAllowFile,
    fileCount,
  };
}

const { values } = parseArgs({ options: { config: { type: 'string' } } });
if (!values.config) fail('usage: check-words.mjs --config <file>');
const { hits, allow, allowFile, fileCount } = checkWords(path.resolve(values.config));

for (const { pattern, path: glob, reason } of allow.filter((a) => !a.used)) {
  const shown = JSON.stringify({ pattern, path: glob, reason });
  console.warn(`check-words: warning: unused allow entry ${shown} in ${allowFile}`);
}
for (const hit of hits) {
  const location = hit.line === 0 ? `${hit.rel} (name)` : `${hit.rel}:${hit.line}`;
  console.error(`${location} "${hit.term}": ${hit.excerpt}`);
}
if (hits.length > 0) {
  fail(
    `${hits.length} telltale word(s) found. Reword user-visible text and identifiers; for a ` +
      `platform keyword such as a style value, add an exact pattern with a reason to ${allowFile}.`,
  );
}
console.log(`check-words: ${fileCount} file(s) scanned, no telltale words`);
