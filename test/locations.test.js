import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';

describe('paymentLink locations filter', () => {
  it('GET /paymentLink/locations?publicName=Test Shop returns cities', async () => {
    const params = new URLSearchParams({ publicName: 'Test Shop' });
    const { status, body } = await getJson(`/paymentLink/locations?${params}`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    if (body.length > 0) {
      for (const item of body) {
        assert.equal(typeof item.city, 'string');
        assert.ok(item.city.length > 0);
      }
    }
  });
});
