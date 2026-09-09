import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';

describe('paymentLink standards', () => {
  it('GET /paymentLink/standard lists OpenCryptoPay', async () => {
    const { status, body } = await getJson('/paymentLink/standard');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.some((s) => s.id === 'OpenCryptoPay'));
  });

  it('GET /paymentLink/standard/OpenCryptoPay returns details', async () => {
    const { status, body } = await getJson('/paymentLink/standard/OpenCryptoPay');
    assert.equal(status, 200);
    assert.equal(body.id, 'OpenCryptoPay');
    assert.ok(body.label);
    assert.ok(body.description);
  });

  it('GET /paymentLink/standard/:id returns details for every listed id', async () => {
    const { status, body } = await getJson('/paymentLink/standard');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    for (const item of body) {
      const detail = await getJson(`/paymentLink/standard/${encodeURIComponent(item.id)}`);
      assert.equal(detail.status, 200);
      assert.equal(detail.body.id, item.id);
    }
  });

  it('GET /paymentLink/standard/NotAStandard returns Payment standard not found', async () => {
    const { status, body } = await getJson('/paymentLink/standard/NotAStandard');
    assert.equal(status, 404);
    assert.equal(body.message, 'Payment standard not found');
  });
});
