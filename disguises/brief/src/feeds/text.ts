// Feed text to plain text: tags stripped, entities decoded, whitespace collapsed. Pure TS.

/** Characters a gist keeps at most, before the ellipsis. */
export const GIST_MAX = 280;

/** The named entities feeds use in titles and summaries; anything else stays as written. */
const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  eacute: 'é',
  egrave: 'è',
  aacute: 'á',
  agrave: 'à',
  oacute: 'ó',
  uacute: 'ú',
  iacute: 'í',
  ntilde: 'ñ',
  ccedil: 'ç',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  szlig: 'ß',
  pound: '£',
  euro: '€',
  yen: '¥',
  cent: '¢',
  times: '×',
  minus: '−',
};

/** Decodes `&name;`, `&#123;` and `&#x7b;` once (so `&amp;lt;` becomes `&lt;`, not `<`). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] !== '#') return NAMED[body] ?? entity;
    const code =
      body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
    return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)
      ? String.fromCodePoint(code)
      : entity;
  });
}

/** Markup to plain text: scripts, styles and tags removed, entities decoded, whitespace collapsed. */
export function plainText(markup: string): string {
  const stripped = markup
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

/**
 * The gist of a summary: plain text, cut to `max` characters at the last word boundary that fits
 * (mid-word only when there is none), with an ellipsis when cut.
 */
export function gist(markup: string, max = GIST_MAX): string {
  const text = plainText(markup);
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const boundary = cut.lastIndexOf(' ');
  const kept = boundary > 0 ? cut.slice(0, boundary) : text.slice(0, max);
  return `${kept.replace(/[\s,.;:–—-]+$/, '')}…`;
}
