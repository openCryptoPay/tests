import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jsonFetch } from './support.js';

describe('paymentLink assign', () => {
  it('PUT /paymentLink/assign with empty body requires publicName', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink/assign', {});
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
    assert.ok(
      body.message.some((m) => String(m).toLowerCase().includes('publicname')),
      'expected publicName validation in message array',
    );
  });

  it('PUT /paymentLink/assign with publicName only requires id or externalId', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink/assign', {
      publicName: 'Test Shop',
    });
    assert.equal(status, 400);
    assert.equal(body.message, 'id or externalId is required');
  });
});
