// URL checks, without the `URL` class (React Native's implements few of its getters).

const HTTPS = /^https:\/\/([^/?#@:]+)(?::\d+)?(?:[/?#]|$)/i;

/** The lower-cased host of an absolute `https:` URL, else `undefined`. */
export function httpsHost(url: string): string | undefined {
  return HTTPS.exec(url)?.[1]?.toLowerCase();
}

/** Whether `url` is an absolute `https:` URL with a plain host name (no user info). */
export function isHttps(url: string): boolean {
  return httpsHost(url) !== undefined;
}

/**
 * `ref` as an absolute `https:` URL: as it is when already one, else resolved against `base` (an
 * `https:` URL) when it is protocol-relative, root-relative or path-relative. Anything else (an
 * `http:`, `data:` or `javascript:` URL, or no usable base) gives `undefined`.
 */
export function absoluteHttps(ref: string, base?: string): string | undefined {
  const url = ref.trim();
  if (url === '') return undefined;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return isHttps(url) ? url : undefined;
  if (url.startsWith('//')) return absoluteHttps(`https:${url}`);
  if (base === undefined || !isHttps(base)) return undefined;
  const origin = /^https:\/\/[^/?#]+/i.exec(base)![0];
  if (url.startsWith('/')) return absoluteHttps(origin + url);
  const path = base.slice(origin.length).replace(/[?#].*$/, '');
  const directory = path.slice(0, path.lastIndexOf('/') + 1) || '/';
  return absoluteHttps(origin + directory + url);
}
