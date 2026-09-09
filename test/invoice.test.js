import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, getJson } from '../lib/http.js';
import { ROUTE, cancelInvoice, withInvoice } from './support.js';

describe('public invoice create, cancel, wait', () => {
  it('GET /paymentLink/payment with no query returns 400 validation array', async () => {
    const { status, body } = await getJson('/paymentLink/payment');
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
  });

  it('GET /paymentLink/payment with route only requires amount or message', async () => {
    const { status, body } = await getJson(
      `/paymentLink/payment?route=${encodeURIComponent(ROUTE)}`,
    );
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
    assert.ok(
      body.message.some((m) => {
        const s = String(m).toLowerCase();
        return s.includes('amount') || s.includes('message');
      }),
      'expected amount or message in validation array',
    );
  });

  it('creates invoice, pending wait aborts, cancel then wait is 404', async () => {
    let id;
    await withInvoice(async (created) => {
      id = created.id;

      const pending = await getJson(`/lnurlp/${id}?timeout=0`);
      assert.equal(pending.status, 200);
      assert.equal(pending.body.standard, 'OpenCryptoPay');

      await assert.rejects(
        async () => {
          await fetch(`${BASE}/lnurlp/wait/${id}`, {
            signal: AbortSignal.timeout(2000),
          });
        },
        (err) => {
          const name = err?.name ?? '';
          return (
            name === 'TimeoutError' ||
            name === 'AbortError' ||
            name.includes('Timeout') ||
            name.includes('Abort')
          );
        },
      );
    });

    const { status, body } = await getJson(`/lnurlp/wait/${id}`);
    assert.equal(status, 404);
    assert.equal(body.message, 'No pending payment found');
  });

  it('GET /plp compact create then cancel', async () => {
    const m = `ocp-plp-${Date.now()}`;
    let id;
    let testErr;
    try {
      const { status, body } = await getJson(
        `${BASE}/plp?r=${encodeURIComponent(ROUTE)}&a=0.01&m=${encodeURIComponent(m)}`,
      );
      assert.equal(status, 200);
      assert.equal(typeof body.id, 'string');
      assert.ok(body.id.startsWith('pl_'));
      id = body.id;
      assert.equal(body.standard, 'OpenCryptoPay');
      assert.equal(body.requestedAmount.amount, 0.01);
    } catch (err) {
      testErr = err;
      throw err;
    } finally {
      if (id) {
        try {
          await cancelInvoice(id);
        } catch (cancelErr) {
          if (!testErr) throw cancelErr;
          testErr.cause = cancelErr;
        }
      }
    }
  });

  it('GET /plp with no query returns 400 validation array', async () => {
    const { status, body } = await getJson(`${BASE}/plp`);
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.message));
  });
});
