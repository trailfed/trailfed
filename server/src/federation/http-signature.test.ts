// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { parseSignatureHeader, verifyRequestSignature } from './http-signature.js';

function makeKeypair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function signRequest(params: {
  privateKeyPem: string;
  keyId: string;
  method: string;
  path: string;
  host: string;
  date: string;
  body: Buffer;
}): Record<string, string> {
  const digest = `SHA-256=${createHash('sha256').update(params.body).digest('base64')}`;
  const signingString = [
    `(request-target): ${params.method.toLowerCase()} ${params.path}`,
    `host: ${params.host}`,
    `date: ${params.date}`,
    `digest: ${digest}`,
  ].join('\n');
  const signer = createSign('RSA-SHA256');
  signer.update(signingString);
  signer.end();
  const signature = signer.sign(params.privateKeyPem).toString('base64');
  const signatureHeader =
    `keyId="${params.keyId}",algorithm="rsa-sha256",` +
    `headers="(request-target) host date digest",signature="${signature}"`;
  return {
    host: params.host,
    date: params.date,
    digest,
    signature: signatureHeader,
  };
}

describe('parseSignatureHeader', () => {
  it('extracts keyId, headers, signature', () => {
    const parsed = parseSignatureHeader(
      'keyId="https://a.example/actor#main",algorithm="rsa-sha256",' +
        'headers="(request-target) host date",signature="abc=="',
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.keyId).toBe('https://a.example/actor#main');
    expect(parsed!.headers).toEqual(['(request-target)', 'host', 'date']);
    expect(parsed!.signature).toBe('abc==');
  });

  it('returns null for missing keyId', () => {
    expect(parseSignatureHeader('signature="abc=="')).toBeNull();
  });
});

describe('verifyRequestSignature', () => {
  const now = new Date('2026-04-23T10:00:00Z');
  const path = '/actors/stub/inbox';
  const host = 'camp.trailfed.org';
  const keyId = 'https://remote.example/actors/alice#main-key';

  it('accepts a well-formed signed request', async () => {
    const { publicKey, privateKey } = makeKeypair();
    const body = Buffer.from(JSON.stringify({ type: 'Follow' }));
    const headers = signRequest({
      privateKeyPem: privateKey,
      keyId,
      method: 'POST',
      path,
      host,
      date: now.toUTCString(),
      body,
    });
    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers,
      body,
      fetchPublicKeyPem: async (id) => (id === keyId ? publicKey : null),
      now: () => now,
    });
    expect(result).toEqual({ ok: true, keyId });
  });

  it('rejects a request with a tampered body (digest mismatch)', async () => {
    const { publicKey, privateKey } = makeKeypair();
    const body = Buffer.from(JSON.stringify({ type: 'Follow' }));
    const headers = signRequest({
      privateKeyPem: privateKey,
      keyId,
      method: 'POST',
      path,
      host,
      date: now.toUTCString(),
      body,
    });
    const tampered = Buffer.from(JSON.stringify({ type: 'Block' }));
    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers,
      body: tampered,
      fetchPublicKeyPem: async () => publicKey,
      now: () => now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/digest/);
  });

  it('rejects when the signature is signed by a different key', async () => {
    const real = makeKeypair();
    const attacker = makeKeypair();
    const body = Buffer.from('{}');
    const headers = signRequest({
      privateKeyPem: attacker.privateKey,
      keyId,
      method: 'POST',
      path,
      host,
      date: now.toUTCString(),
      body,
    });
    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers,
      body,
      fetchPublicKeyPem: async () => real.publicKey,
      now: () => now,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects missing signature header', async () => {
    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers: { host, date: now.toUTCString() },
      body: Buffer.from(''),
      fetchPublicKeyPem: async () => null,
      now: () => now,
    });
    expect(result).toEqual({ ok: false, reason: 'missing signature header' });
  });

  it('rejects when date is outside skew window', async () => {
    const { publicKey, privateKey } = makeKeypair();
    const body = Buffer.from('{}');
    const staleDate = new Date('2026-04-23T09:00:00Z').toUTCString();
    const headers = signRequest({
      privateKeyPem: privateKey,
      keyId,
      method: 'POST',
      path,
      host,
      date: staleDate,
      body,
    });
    const result = await verifyRequestSignature({
      method: 'POST',
      path,
      headers,
      body,
      fetchPublicKeyPem: async () => publicKey,
      now: () => now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/date/);
  });
});
