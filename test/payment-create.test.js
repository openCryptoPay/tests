import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, LINK_ID, getJson } from '../lib/http.js';

describe('paymentLink payment create (unauthenticated)', () => {
  it('POST without amount returns 400 with amount validation', async () => {
    const res = await fetch(
      `${BASE}/paymentLink/payment?linkId=${encodeURIComponent(LINK_ID)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(20_000),
      },
    );
    assert.equal(res.status, 400);

    const text = await res.text();
    assert.ok(text.length > 0);
    const body = JSON.parse(text);
    assert.ok(Array.isArray(body.message));
    assert.ok(
      body.message.some((m) => String(m).toLowerCase().includes('amount')),
      'expected amount validation in message array',
    );
  });

  it('POST with amount but no credentials returns Route not found', async () => {
    const res = await fetch(
      `${BASE}/paymentLink/payment?linkId=${encodeURIComponent(LINK_ID)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0.01 }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    assert.equal(res.status, 404);

    const text = await res.text();
    assert.ok(text.length > 0);
    const body = JSON.parse(text);
    assert.equal(body.message, 'Route not found');
  });
});

const POS_KEY = process.env.OCP_ACCESS_KEY;
const POS_LINK_ID = process.env.OCP_POS_LINK_ID;
const POS_ENABLED = Boolean(POS_KEY && POS_LINK_ID);

describe('paymentLink payment create (POS)', { skip: !POS_ENABLED }, () => {
  it('creates and cancels a payment with access key', async () => {
    const key = POS_KEY;
    const posLinkId = POS_LINK_ID;
    assert.ok(posLinkId);
    assert.notEqual(posLinkId, LINK_ID);
    assert.notEqual(posLinkId, 'pl_beeddb41cd4b6d9e');
    const externalId = `ocp-tests-${Date.now()}`;
    const createUrl =
      `${BASE}/paymentLink/payment?key=${encodeURIComponent(key)}` +
      `&linkId=${encodeURIComponent(posLinkId)}`;

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 0.01,
        currency: 'CHF',
        externalId,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    let created = false;
    let testErr;
    try {
      assert.ok(
        createRes.status === 200 || createRes.status === 201,
        `expected 200 or 201 from create, got ${createRes.status}`,
      );
      created = true;

      const createText = await createRes.text();
      assert.ok(createText.length > 0);
      const createBody = JSON.parse(createText);
      assert.ok(
        typeof createBody.uniqueId === 'string' || typeof createBody.id === 'number',
        'expected create body uniqueId string or id number',
      );

      const pay = await getJson(`/lnurlp/${posLinkId}?timeout=0`);
      assert.equal(pay.status, 200);
    } catch (err) {
      testErr = err;
      throw err;
    } finally {
      if (created) {
        try {
          const cancelUrl =
            `${BASE}/paymentLink/payment?key=${encodeURIComponent(key)}` +
            `&linkId=${encodeURIComponent(posLinkId)}` +
            `&externalPaymentId=${encodeURIComponent(externalId)}`;
          const cancelRes = await fetch(cancelUrl, {
            method: 'DELETE',
            signal: AbortSignal.timeout(20_000),
          });
          assert.ok(
            cancelRes.status === 200 || cancelRes.status === 204,
            `expected 200 or 204 from cancel, got ${cancelRes.status}`,
          );
        } catch (cancelErr) {
          if (!testErr) throw cancelErr;
          testErr.cause = cancelErr;
        }
      }
    }
  });
});
