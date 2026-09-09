import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE } from '../lib/http.js';

describe('lnurlp cancel', () => {
  it('DELETE /lnurlp/cancel/pl_doesnotexist returns No pending payment found', async () => {
    const res = await fetch(`${BASE}/lnurlp/cancel/pl_doesnotexist`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(res.status, 404);

    const text = await res.text();
    assert.ok(text.length > 0);
    const body = JSON.parse(text);
    assert.equal(body.message, 'No pending payment found');
  });
});
