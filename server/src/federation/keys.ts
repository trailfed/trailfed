// SPDX-License-Identifier: AGPL-3.0-or-later

// Keypair helpers built on Fedify's crypto primitives — no hand-rolled crypto
// code (per the lego-stack rule in MEMORY.md).

import { exportJwk, generateCryptoKeyPair, importJwk } from '@fedify/fedify';

export type Jwk = Record<string, unknown>;

/**
 * Generate a fresh RSA-2048 keypair compatible with ActivityPub HTTP
 * Signatures (RSASSA-PKCS1-v1_5). Returned as JWK JSON so we can persist
 * directly into a jsonb column.
 */
export async function generateActorKeys(): Promise<{
  publicKeyJwk: Jwk;
  privateKeyJwk: Jwk;
}> {
  const pair = await generateCryptoKeyPair('RSASSA-PKCS1-v1_5');
  const publicKeyJwk = (await exportJwk(pair.publicKey)) as Jwk;
  const privateKeyJwk = (await exportJwk(pair.privateKey)) as Jwk;
  return { publicKeyJwk, privateKeyJwk };
}

export async function importActorKeys(stored: {
  publicKeyJwk: Jwk;
  privateKeyJwk: Jwk;
}): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const publicKey = await importJwk(stored.publicKeyJwk as never, 'public');
  const privateKey = await importJwk(stored.privateKeyJwk as never, 'private');
  return { publicKey, privateKey };
}
