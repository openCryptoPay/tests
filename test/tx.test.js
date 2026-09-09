import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';
import { withInvoice } from './support.js';

describe('lnurlp tx', () => {
  it('GET /lnurlp/tx without quote returns Quote parameter missing', async () => {
    await withInvoice(async ({ id }) => {
      const { status, body } = await getJson(`/lnurlp/tx/${id}`);
      assert.equal(status, 400);
      assert.equal(body.message, 'Quote parameter missing');
    });
  });

  it('quote/hex cases on one created invoice', async (t) => {
    await withInvoice(async ({ id }) => {
      const pay = await getJson(`/lnurlp/${id}?timeout=0`);
      assert.equal(pay.status, 200);
      const quoteId = pay.body.quote.id;

      await t.test('GET /lnurlp/tx with quote and method but no hex/tx/sender', async () => {
        const { status, body } = await getJson(
          `/lnurlp/tx/${id}?quote=${encodeURIComponent(quoteId)}&method=Ethereum`,
        );
        assert.equal(status, 400);
        assert.equal(body.message, 'Hex, Tx or Sender parameter missing');
      });

      await t.test('GET /lnurlp/tx with invalid hex returns invalid message', async () => {
        const { status, body } = await getJson(
          `/lnurlp/tx/${id}?quote=${encodeURIComponent(quoteId)}&method=Ethereum&hex=not-a-hex`,
        );
        assert.equal(status, 400);
        assert.equal(typeof body.message, 'string');
        assert.ok(
          body.message.toLowerCase().includes('invalid'),
          'expected message to mention invalid',
        );
      });
    });
  });
});
