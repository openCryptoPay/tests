import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';
import { callbackUrl, withInvoice } from './support.js';

async function getCallbackOrSkip(nested, url, method, linkId) {
  let status;
  let body;
  try {
    ({ status, body } = await getJson(url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const http = msg.match(/HTTP (\d+)/);
    if (http) {
      const code = Number(http[1]);
      if (method === 'BinancePay') {
        assert.equal(code, 503);
        assert.equal(typeof msg, 'string');
        return null;
      }
    }
    throw err;
  }
  if (status === 404) {
    const again = await getJson(`/lnurlp/${linkId}?timeout=0`);
    if (again.status === 404 && again.body?.message === 'No pending payment found') {
      nested.skip('Quote vanished before callback (no pending payment)');
      return null;
    }
    assert.fail(`callback 404 but pay-request still pending; message=${body?.message ?? '(none)'}`);
  }
  if (status >= 500) {
    if (method === 'BinancePay') {
      assert.equal(status, 503);
      assert.equal(typeof body.message, 'string');
      return null;
    }
    assert.fail(`callback HTTP ${status}: ${body?.message ?? '(none)'}`);
  }
  return { status, body };
}

describe('lnurlp callback', () => {
  it('GET /lnurlp/cb without quote returns no matching quote', async () => {
    await withInvoice(async ({ id }) => {
      const { status, body } = await getJson(`/lnurlp/cb/${id}`);
      assert.equal(status, 404);
      assert.equal(body.message, 'No matching actual quote found');
    });
  });

  it('pending callback cases on one created invoice', async (t) => {
    await withInvoice(async ({ id }) => {
      const pay = await getJson(`/lnurlp/${id}?timeout=0`);
      assert.equal(pay.status, 200);
      assert.equal(typeof pay.body.callback, 'string');
      assert.ok(pay.body.callback.startsWith('http'));
      const quoteId = pay.body.quote.id;
      const transferAmounts = pay.body.transferAmounts ?? [];

      await t.test('GET callback for every available method×asset', async (nested) => {
        const available = transferAmounts.filter(
          (ta) => ta.available === true && Array.isArray(ta.assets) && ta.assets.length > 0,
        );
        assert.ok(available.length > 0);
        for (const ta of available) {
          const method = ta.method;
          for (const a of ta.assets) {
            const asset = a.asset;
            await nested.test(`${method} ${asset}`, async (inner) => {
              const url = callbackUrl(pay.body.callback, { quote: quoteId, method, asset });
              const result = await getCallbackOrSkip(inner, url, method, id);
              if (!result) return;
              const { status, body } = result;
              assert.equal(status, 200);
              if (method === 'Lightning') {
                assert.equal(typeof body.pr, 'string');
                assert.ok(body.pr.toLowerCase().startsWith('ln'));
              } else {
                assert.equal(body.blockchain, method);
                assert.equal(typeof body.uri, 'string');
                assert.ok(body.uri.length > 0);
                assert.ok(body.expiryDate);
              }
            });
          }
        }
      });
    });
  });

  it('callback defaults and errors on a fresh invoice', async (t) => {
    await withInvoice(async ({ id }) => {
      const pay = await getJson(`/lnurlp/${id}?timeout=0`);
      assert.equal(pay.status, 200);
      const quoteId = pay.body.quote.id;
      const transferAmounts = pay.body.transferAmounts ?? [];

      await t.test('GET callback with quote only defaults to Lightning pr', async () => {
        const url = callbackUrl(pay.body.callback, { quote: quoteId });
        const { status, body } = await getJson(url);
        assert.equal(status, 200);
        assert.equal(typeof body.pr, 'string');
        assert.ok(body.pr.toLowerCase().startsWith('ln'));
      });

      await t.test(
        'GET callback with method=Ethereum without asset is Invalid method or asset',
        async () => {
          const url = callbackUrl(pay.body.callback, {
            quote: quoteId,
            method: 'Ethereum',
          });
          const { status, body } = await getJson(url);
          assert.equal(status, 400);
          assert.equal(body.message, 'Invalid method or asset');
        },
      );

      await t.test('GET callback with unknown quote returns no matching quote', async () => {
        const url = callbackUrl(pay.body.callback, {
          quote: 'plq_doesnotexist',
          method: 'Lightning',
          asset: 'BTC',
        });
        const { status, body } = await getJson(url);
        assert.equal(status, 404);
        assert.equal(body.message, 'No matching actual quote found');
      });

      await t.test('GET callback for unavailable methods accepts 400 or Lightning pr', async (nested) => {
        const unavailable = transferAmounts.filter((ta) => ta.available !== true);
        assert.ok(unavailable.length > 0);
        for (const ta of unavailable) {
          const method = ta.method;
          await nested.test(`${method} BTC`, async (inner) => {
            const url = callbackUrl(pay.body.callback, {
              quote: quoteId,
              method,
              asset: 'BTC',
            });
            const result = await getCallbackOrSkip(inner, url, method, id);
            if (!result) return;
            const { status, body } = result;
            if (status === 400) {
              assert.equal(body.message, 'Invalid method or asset');
              return;
            }
            assert.equal(status, 200);
            assert.equal(typeof body.pr, 'string');
            assert.ok(body.pr.toLowerCase().startsWith('ln'));
          });
        }
      });

      await t.test('GET BinancePay callback is 200 with uri or 503', async (nested) => {
        const bp = transferAmounts.find((ta) => ta.method === 'BinancePay');
        if (!bp) {
          nested.skip('BinancePay not advertised on this invoice');
          return;
        }
        const asset = bp.available && bp.assets?.[0]?.asset ? bp.assets[0].asset : 'USDT';
        const url = callbackUrl(pay.body.callback, {
          quote: quoteId,
          method: 'BinancePay',
          asset,
        });
        let status;
        let body;
        try {
          ({ status, body } = await getJson(url));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const http = msg.match(/HTTP (\d+)/);
          assert.ok(http, msg);
          status = Number(http[1]);
          body = { message: msg };
        }
        if (status === 200) {
          assert.equal(body.blockchain, 'BinancePay');
          assert.equal(typeof body.uri, 'string');
          assert.ok(body.uri.length > 0);
          return;
        }
        assert.equal(status, 503);
        assert.equal(typeof body.message, 'string');
      });
    });
  });
});
