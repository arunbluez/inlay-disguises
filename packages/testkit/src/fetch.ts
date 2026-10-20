import type { DisguiseFetch } from '@inlay/disguise-sdk';

/** One request the fetch stub let through. */
export interface FetchCall {
  url: string;
  init?: RequestInit;
}

/** Answers a permitted request; the stub never touches the network. */
export type FetchResponder = (url: string, init?: RequestInit) => Response | Promise<Response>;

export interface MockFetch {
  fetch: DisguiseFetch;
  /** Every permitted request, in order. Rejected requests are not recorded. */
  readonly calls: readonly FetchCall[];
}

/** The lower-cased host name of an absolute URL (no user info, no port), or `undefined`. */
function hostNameOf(url: string): string | undefined {
  const match = /^[a-z][a-z\d+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]*)/i.exec(url);
  return match?.[1] ? match[1].toLowerCase() : undefined;
}

/**
 * A fetch stub with the host's rule: a request whose URL host name is not exactly one of
 * `allowedHosts` rejects with a `TypeError`, like a failed network request. A permitted request
 * is recorded and answered by `respond` (an empty 200 response by default).
 */
export function createMockFetch(
  allowedHosts: readonly string[],
  respond: FetchResponder = () => new Response(null, { status: 200 }),
): MockFetch {
  const permitted = new Set(allowedHosts.map((host) => host.toLowerCase()));
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      const host = hostNameOf(url);
      if (host === undefined || !permitted.has(host)) {
        throw new TypeError(`Request to ${url} rejected: its host is not in allowedHosts`);
      }
      calls.push(init === undefined ? { url } : { url, init });
      return respond(url, init);
    },
  };
}
