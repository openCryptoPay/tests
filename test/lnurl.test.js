import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeLnurl, encodeLnurl } from '../lib/lnurl.js';

const DOCUMENTED_LNURL =
  'LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT';
const EXPECTED_URL = 'https://api.dfx.swiss/v1/lnurlp/pl_beeddb41cd4b6d9e';

describe('decodeLnurl', () => {
  it('decodes the documented uppercase LNURL', () => {
    assert.equal(decodeLnurl(DOCUMENTED_LNURL), EXPECTED_URL);
  });

  it('decodes the same LNURL in lowercase', () => {
    assert.equal(decodeLnurl(DOCUMENTED_LNURL.toLowerCase()), EXPECTED_URL);
  });

  it('throws on invalid input', () => {
    assert.throws(() => decodeLnurl('not-a-lnurl'));
    assert.throws(() => decodeLnurl(''));
    assert.throws(() => decodeLnurl(DOCUMENTED_LNURL.slice(0, 20)));
  });
});

describe('encodeLnurl', () => {
  it('roundtrips the documented pay-request URL', () => {
    const encoded = encodeLnurl(EXPECTED_URL);
    assert.equal(typeof encoded, 'string');
    assert.ok(encoded.startsWith('LNURL1'));
    assert.equal(decodeLnurl(encoded), EXPECTED_URL);
    assert.equal(encodeLnurl(EXPECTED_URL), DOCUMENTED_LNURL);
  });
});
