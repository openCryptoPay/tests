import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';
import { ROUTE } from './support.js';

describe('paymentLink recipient', () => {
  it('GET /paymentLink/recipient?id={ROUTE}', async () => {
    const { status, body } = await getJson(
      `/paymentLink/recipient?id=${encodeURIComponent(ROUTE)}`,
    );
    assert.equal(status, 200);
    assert.equal(typeof body.id, 'number');
    assert.equal(body.currency.name, 'CHF');
  });

  it('GET /paymentLink/recipient without id returns Payment route not found', async () => {
    const { status, body } = await getJson('/paymentLink/recipient');
    assert.equal(status, 404);
    assert.equal(body.message, 'Payment route not found');
  });

  it('GET /paymentLink/recipient with unknown id returns Payment route not found', async () => {
    const { status, body } = await getJson(
      '/paymentLink/recipient?id=not-a-real-recipient-xyz',
    );
    assert.equal(status, 404);
    assert.equal(body.message, 'Payment route not found');
  });
});
