export const BASE = (process.env.OCP_BASE_URL ?? 'https://dev.api.dfx.swiss/v1').replace(/\/+$/, '');
export const LINK_ID = process.env.OCP_LINK_ID ?? 'pl_beeddb41cd4b6d9e';

const REDACT_KEYS = new Set(['phone', 'mail']);

/** Recursively redact merchant PII keys before any error message dumps a body. */
function redactPii(value) {
  if (Array.isArray(value)) {
    return value.map(redactPii);
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.has(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = redactPii(v);
      }
    }
    return out;
  }
  return value;
}

function errorWithBody(message, body) {
  return new Error(`${message}; body=${JSON.stringify(redactPii(body))}`);
}

/**
 * GET JSON from BASE+path or an absolute URL.
 * Does not throw on HTTP error status; returns { status, body }.
 * @param {string} path
 * @returns {Promise<{ status: number, body: unknown }>}
 */
export async function getJson(path) {
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${BASE}${path}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Request failed for ${url}: ${msg}`);
  }

  let text;
  try {
    text = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw errorWithBody(`Failed reading response from ${url}: ${msg}`, null);
  }

  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${url} (HTTP ${res.status})`);
    }
  }

  return { status: res.status, body };
}
