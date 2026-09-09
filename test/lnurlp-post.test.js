import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, LINK_ID } from '../lib/http.js';

describe('lnurlp POST without amount', () => {
  it('POST /lnurlp/{id}?timeout=0 without amount returns 400', async () => {
    const url = `${BASE}/lnurlp/${LINK_ID}?timeout=0`;
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(res.status, 400);

    const text = await res.text();
    assert.ok(text.length > 0);
    const body = JSON.parse(text);
    assert.ok(Array.isArray(body?.message));
    assert.ok(
      body.message.some((m) => String(m).toLowerCase().includes('amount')),
      'expected amount validation in message array',
    );
  });
});
