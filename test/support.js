import assert from 'node:assert/strict';
import { BASE, LINK_ID, getJson } from '../lib/http.js';

export const ROUTE =
  process.env.OCP_ROUTE ??
  (BASE.includes('dev.api.dfx.swiss') ? 'SPAR' : 'DFX VM 01');

/**
 * Build a callback URL with optional query params.
 * Only appends params that are provided (omits undefined/null).
 */
export function callbackUrl(callback, { quote, method, asset } = {}) {
  const params = [];
  if (quote != null) params.push(`quote=${encodeURIComponent(quote)}`);
  if (method != null) params.push(`method=${encodeURIComponent(method)}`);
  if (asset != null) params.push(`asset=${encodeURIComponent(asset)}`);
  if (params.length === 0) return callback;
  const sep = callback.includes('?') ? '&' : '?';
  return `${callback}${sep}${params.join('&')}`;
}

/**
 * Create a 0.01 CHF OpenCryptoPay invoice on ROUTE.
 * @param {string} message
 * @returns {Promise<{ id: string, body: object }>}
 */
async function openInvoice(message) {
  const { status, body } = await getJson(
    `/paymentLink/payment?route=${encodeURIComponent(ROUTE)}` +
      `&amount=0.01&message=${encodeURIComponent(message)}`,
  );
  assert.equal(status, 200);
  const id = body?.id;
  assert.equal(typeof id, 'string');
  assert.ok(id.startsWith('pl_'));
  return { id, body };
}

/**
 * Cancel a created invoice. Refuses the demo link id.
 * @param {string} id
 */
export async function cancelInvoice(id) {
  if (!id || id === LINK_ID || id === 'pl_beeddb41cd4b6d9e') {
    throw new Error(`refusing to cancel demo link id: ${id}`);
  }
  const { status, body } = await jsonFetch('DELETE', `/lnurlp/cancel/${id}`);
  assert.equal(status, 200);
  assert.equal(body.status, 'Cancelled');
}

/**
 * Create an invoice, run fn, always cancel in finally.
 * @param {(created: { id: string, body: object }) => Promise<unknown>} fn
 */
export async function withInvoice(fn) {
  const message = `ocp-tests-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let id;
  let fnErr;
  try {
    const created = await openInvoice(message);
    id = created.id;
    assert.equal(created.body.standard, 'OpenCryptoPay');
    assert.equal(created.body.requestedAmount.amount, 0.01);
    return await fn({ id, body: created.body });
  } catch (err) {
    fnErr = err;
    throw err;
  } finally {
    if (id) {
      try {
        await cancelInvoice(id);
      } catch (cancelErr) {
        if (fnErr) {
          fnErr.cause = cancelErr;
        } else {
          throw cancelErr;
        }
      }
    }
  }
}

/**
 * GET/PUT/POST/DELETE JSON against BASE+path (or absolute URL).
 * Does not throw on HTTP error status; returns { status, body }.
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 * @returns {Promise<{ status: number, body: unknown }>}
 */
export async function jsonFetch(method, path, body) {
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${BASE}${path}`;

  const init = {
    method,
    signal: AbortSignal.timeout(20_000),
  };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Request failed for ${url}: ${msg}`);
  }

  let text;
  try {
    text = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed reading response from ${url}: ${msg}`);
  }

  let parsed = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${url} (HTTP ${res.status})`);
    }
  }

  return { status: res.status, body: parsed };
}
