// LUD-01 LNURL bech32 decode (BIP-173), zero deps.

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values) {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GENERATORS[i];
    }
  }
  return chk;
}

function expandHrp(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function convertbits(data, frombits, tobits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << tobits) - 1;
  for (const value of data) {
    if (value < 0 || value >> frombits) {
      throw new Error('Invalid convertbits value');
    }
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (tobits - bits)) & maxv);
  } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
    throw new Error('Invalid convertbits padding');
  }
  return ret;
}

/**
 * Decode an LNURL1… bech32 string (LUD-01) to its UTF-8 URL.
 * @param {string} lnurl
 * @returns {string}
 */
export function decodeLnurl(lnurl) {
  if (typeof lnurl !== 'string') {
    throw new Error('LNURL must be a string');
  }
  const trimmed = lnurl.trim();
  if (!trimmed) {
    throw new Error('Empty LNURL');
  }

  const lower = trimmed.toLowerCase();
  const sep = lower.lastIndexOf('1');
  if (sep < 1) {
    throw new Error('Missing HRP separator');
  }

  const hrp = lower.slice(0, sep);
  const dataPart = lower.slice(sep + 1);
  if (hrp !== 'lnurl') {
    throw new Error('HRP must be lnurl');
  }
  if (dataPart.length < 6) {
    throw new Error('Data too short for checksum');
  }

  const data = [];
  for (const c of dataPart) {
    const v = CHARSET.indexOf(c);
    if (v === -1) {
      throw new Error('Invalid bech32 charset');
    }
    data.push(v);
  }

  if (polymod(expandHrp(hrp).concat(data)) !== 1) {
    throw new Error('Invalid bech32 checksum');
  }

  const payload = data.slice(0, -6);
  const bytes = convertbits(payload, 5, 8, false);
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
}

/**
 * Encode a UTF-8 URL as an LNURL1… bech32 string (LUD-01 / BIP-173).
 * @param {string} url
 * @returns {string} Uppercase LNURL1… bech32
 */
export function encodeLnurl(url) {
  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }
  if (!url) {
    throw new Error('Empty URL');
  }

  const hrp = 'lnurl';
  const bytes = Array.from(new TextEncoder().encode(url));
  const data = convertbits(bytes, 8, 5, true);

  const mod = polymod(expandHrp(hrp).concat(data).concat([0, 0, 0, 0, 0, 0])) ^ 1;
  const checksum = [];
  for (let i = 0; i < 6; i++) {
    checksum.push((mod >> (5 * (5 - i))) & 31);
  }

  let encoded = hrp + '1';
  for (const v of data.concat(checksum)) {
    encoded += CHARSET[v];
  }
  return encoded.toUpperCase();
}
