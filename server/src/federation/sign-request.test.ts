// SPDX-License-Identifier: AGPL-3.0-or-later

import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { parseSignatureHeader, verifyRequestSignature } from './http-signature.js';
import { signOutgoingRequest } from './sign-request.js';

function makeKeypair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

describe('signOutgoingRequest', () => {
  const now = () => new Date('2026-04-23T10:00:00Z');

  it('produces a signature our verifier accepts', async () => {
    const { publicKey, privateKey } = makeKeypair();
    const keyId = 'https://a.example/actors/alice#main-key';
    const url = 'https://b.example/actors/bob/inbox';
    const body = Buffer.from(JSON.stringify({ type: 'Follow' }));

    const headers = signOutgoingRequest({
      method: 'POST',
      url,
      body,
      privateKeyPem: privateKey,
      keyId,
      now,
    });

    // Feed it back through the verifier exactly as the receiver would.
    const path = new URL(url).pathname + new URL(url).search;
    const lowerHeaders: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(headers)) lowerHeaders[k.toLowerCase()] = v;

    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers: lowerHeaders,
      body,
      fetchPublicKeyPem: async (id) => (id === keyId ? publicKey : null),
      now,
    });
    expect(result).toEqual({ ok: true, keyId });

    const parsed = parseSignatureHeader(headers.Signature!);
    expect(parsed?.headers).toEqual(['(request-target)', 'host', 'date', 'digest']);
  });
});
