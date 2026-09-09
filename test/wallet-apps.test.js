import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson } from '../lib/http.js';

describe('paymentLink wallet apps', () => {
  it('GET /paymentLink/walletApp returns apps with methods', async () => {
    const { status, body } = await getJson('/paymentLink/walletApp');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    for (const item of body) {
      assert.ok(item.id);
      assert.ok(item.name);
      assert.ok(Array.isArray(item.supportedMethods));
    }
  });

  it('GET /paymentLink/walletApp/recommended returns recommended apps', async () => {
    const { status, body } = await getJson('/paymentLink/walletApp/recommended');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    for (const item of body) {
      assert.equal(item.recommended, true);
    }
  });

  it('GET /paymentLink/walletApp/:id returns the first recommended app', async () => {
    const { status, body } = await getJson('/paymentLink/walletApp/recommended');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    const id = body[0].id;
    const detail = await getJson(`/paymentLink/walletApp/${encodeURIComponent(id)}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, id);
    assert.equal(typeof detail.body.name, 'string');
    assert.ok(detail.body.name.length > 0);
    assert.ok(Array.isArray(detail.body.supportedMethods));
  });

  it('GET /paymentLink/walletApp/:id returns every listed app', async (t) => {
    const { status, body } = await getJson('/paymentLink/walletApp');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    for (const item of body) {
      await t.test(String(item.id), async () => {
        const detail = await getJson(
          `/paymentLink/walletApp/${encodeURIComponent(item.id)}`,
        );
        assert.equal(detail.status, 200);
        assert.equal(detail.body.id, item.id);
      });
    }
  });

  it('GET /paymentLink/walletApp/99999 returns Wallet app not found', async () => {
    const { status, body } = await getJson('/paymentLink/walletApp/99999');
    assert.equal(status, 404);
    assert.equal(body.message, 'Wallet app not found');
  });

  it('GET /paymentLink/walletApp?blockchain=Bitcoin filters by Bitcoin or Lightning', async () => {
    const { status, body } = await getJson(
      '/paymentLink/walletApp?blockchain=Bitcoin',
    );
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    for (const app of body) {
      assert.ok(
        app.supportedMethods.includes('Bitcoin') ||
          app.supportedMethods.includes('Lightning'),
        `app ${app.id} should support Bitcoin or Lightning`,
      );
    }
  });

  it('GET /paymentLink/walletApp?active=false returns an array', async () => {
    const { status, body } = await getJson('/paymentLink/walletApp?active=false');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
  });
});
