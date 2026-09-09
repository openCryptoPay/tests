import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LINK_ID, getJson } from '../lib/http.js';
import { jsonFetch } from './support.js';

describe('unauthenticated paymentLink routes', () => {
  it('GET /paymentLink returns Unauthorized', async () => {
    const { status, body } = await getJson('/paymentLink');
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('GET /paymentLink/config returns Unauthorized', async () => {
    const { status, body } = await getJson('/paymentLink/config');
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('GET /paymentLink/history returns Forbidden resource', async () => {
    const { status, body } = await getJson('/paymentLink/history');
    assert.equal(status, 403);
    assert.equal(body.message, 'Forbidden resource');
  });

  it('GET /paymentLink/locations returns a JSON array', async () => {
    const { status, body } = await getJson('/paymentLink/locations');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
  });

  it('GET /paymentLink?linkId= returns Unauthorized', async () => {
    const { status, body } = await getJson(`/paymentLink?linkId=${LINK_ID}`);
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('PUT /paymentLink with empty JSON returns Unauthorized', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink', {});
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('POST /paymentLink with empty JSON returns Forbidden resource', async () => {
    const { status, body } = await jsonFetch('POST', '/paymentLink', {});
    assert.equal(status, 403);
    assert.equal(body.message, 'Forbidden resource');
  });

  it('PUT /paymentLink/config with empty JSON returns Unauthorized', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink/config', {});
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('POST /paymentLink/merchant with empty JSON returns Unauthorized', async () => {
    const { status, body } = await jsonFetch('POST', '/paymentLink/merchant', {});
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('PUT /paymentLink/pos with empty JSON returns Unauthorized', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink/pos', {});
    assert.equal(status, 401);
    assert.equal(body.message, 'Unauthorized');
  });

  it('PUT /paymentLink/payment/confirm with empty JSON returns Forbidden resource', async () => {
    const { status, body } = await jsonFetch('PUT', '/paymentLink/payment/confirm', {});
    assert.equal(status, 403);
    assert.equal(body.message, 'Forbidden resource');
  });

  it('GET /paymentLink/payment/wait returns Forbidden resource', async () => {
    const { status, body } = await getJson('/paymentLink/payment/wait');
    assert.equal(status, 403);
    assert.equal(body.message, 'Forbidden resource');
  });

  it('DELETE /paymentLink/payment returns Route not found', async () => {
    const { status, body } = await jsonFetch('DELETE', '/paymentLink/payment');
    assert.equal(status, 404);
    assert.equal(body.message, 'Route not found');
  });
});
