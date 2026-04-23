// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash, createVerify } from 'node:crypto';

/**
 * Minimal HTTP Signature verifier — draft-cavage-http-signatures-12 profile
 * used by ActivityPub (Mastodon, Pleroma, GoToSocial, …).
 *
 * We intentionally support only what federated servers actually send:
 *   - algorithm: rsa-sha256 (or the newer `hs2019` as long as the key is RSA)
 *   - signed headers: `(request-target) host date [digest]`
 *   - body integrity via the `Digest: SHA-256=…` header
 *
 * Returns the `keyId` of the verified signer on success so the caller can map
 * it back to an Actor URI for the dispatcher.
 */

export interface VerifyRequestInput {
  method: string;
  /** Path + query as sent on the wire (e.g. `/actors/stub/inbox`). */
  path: string;
  /** Lowercased header map. */
  headers: Record<string, string | undefined>;
  /** Raw request body as bytes; required when the signature covers `digest`. */
  body: Buffer;
  /** Fetcher for the signer's public key PEM, given a `keyId`. */
  fetchPublicKeyPem: (keyId: string) => Promise<string | null>;
  /** Clock skew tolerance for the `Date` header in seconds. Default 300 (5 min). */
  clockSkewSeconds?: number;
  /** Current time, injectable for tests. */
  now?: () => Date;
}

export type VerifyResult = { ok: true; keyId: string } | { ok: false; reason: string };

interface ParsedSignature {
  keyId: string;
  algorithm?: string;
  headers: string[];
  signature: string;
}

export function parseSignatureHeader(header: string): ParsedSignature | null {
  const params: Record<string, string> = {};
  const re = /(\w+)="((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(header)) !== null) {
    params[match[1]] = match[2].replace(/\\"/g, '"');
  }
  if (!params.keyId || !params.signature) return null;
  const headers = (params.headers ?? '(created)').split(/\s+/).filter(Boolean);
  return {
    keyId: params.keyId,
    algorithm: params.algorithm,
    headers,
    signature: params.signature,
  };
}

function buildSigningString(
  parsed: ParsedSignature,
  input: { method: string; path: string; headers: Record<string, string | undefined> },
): string | null {
  const lines: string[] = [];
  for (const name of parsed.headers) {
    if (name === '(request-target)') {
      lines.push(`(request-target): ${input.method.toLowerCase()} ${input.path}`);
    } else {
      const value = input.headers[name.toLowerCase()];
      if (value === undefined) return null;
      lines.push(`${name.toLowerCase()}: ${value}`);
    }
  }
  return lines.join('\n');
}

function verifyDigest(headers: Record<string, string | undefined>, body: Buffer): boolean {
  const digest = headers['digest'];
  if (!digest) return false;
  // Header can carry multiple algorithms: `SHA-256=...,SHA-512=...`.
  for (const part of digest.split(',')) {
    const [algRaw, ...rest] = part.trim().split('=');
    const value = rest.join('=');
    const alg = algRaw.toLowerCase();
    if (alg === 'sha-256') {
      const expected = createHash('sha256').update(body).digest('base64');
      if (expected === value) return true;
    } else if (alg === 'sha-512') {
      const expected = createHash('sha512').update(body).digest('base64');
      if (expected === value) return true;
    }
  }
  return false;
}

function verifyDate(dateHeader: string | undefined, skewSeconds: number, now: Date): boolean {
  if (!dateHeader) return false;
  const parsed = Date.parse(dateHeader);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(now.getTime() - parsed) <= skewSeconds * 1000;
}

export async function verifyRequestSignature(input: VerifyRequestInput): Promise<VerifyResult> {
  const signatureHeader = input.headers['signature'];
  if (!signatureHeader) return { ok: false, reason: 'missing signature header' };

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return { ok: false, reason: 'malformed signature header' };

  if (parsed.algorithm && !['rsa-sha256', 'hs2019'].includes(parsed.algorithm.toLowerCase())) {
    return { ok: false, reason: `unsupported algorithm: ${parsed.algorithm}` };
  }

  if (!parsed.headers.includes('(request-target)') || !parsed.headers.includes('date')) {
    return { ok: false, reason: 'signature must cover (request-target) and date' };
  }

  const now = (input.now ?? (() => new Date()))();
  const skew = input.clockSkewSeconds ?? 300;
  if (!verifyDate(input.headers['date'], skew, now)) {
    return { ok: false, reason: 'date header missing or outside skew window' };
  }

  // If the signature covers `digest`, the body must match it. This is how
  // cavage-12 binds the body to the signature — without it a MITM could swap
  // the payload while keeping the header-only signature intact.
  if (parsed.headers.includes('digest')) {
    if (!verifyDigest(input.headers, input.body)) {
      return { ok: false, reason: 'digest mismatch' };
    }
  }

  const signingString = buildSigningString(parsed, input);
  if (signingString === null) {
    return { ok: false, reason: 'signed header missing from request' };
  }

  const publicKeyPem = await input.fetchPublicKeyPem(parsed.keyId);
  if (!publicKeyPem) {
    return { ok: false, reason: `could not fetch public key for ${parsed.keyId}` };
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(signingString);
  verifier.end();
  const signatureBytes = Buffer.from(parsed.signature, 'base64');
  let valid = false;
  try {
    valid = verifier.verify(publicKeyPem, signatureBytes);
  } catch {
    return { ok: false, reason: 'verifier threw on public key' };
  }
  if (!valid) return { ok: false, reason: 'signature does not verify' };
  return { ok: true, keyId: parsed.keyId };
}

/**
 * Default `fetchPublicKeyPem` implementation: GET the actor document at
 * `keyId` (stripping any `#…` fragment) with an ActivityPub Accept header,
 * and pluck `publicKey.publicKeyPem` out of the JSON.
 */
export async function fetchActorPublicKeyPem(keyId: string): Promise<string | null> {
  const actorUrl = keyId.split('#')[0];
  const res = await fetch(actorUrl, {
    headers: { Accept: 'application/activity+json' },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    publicKey?: { publicKeyPem?: string } | Array<{ publicKeyPem?: string }>;
  };
  const pk = Array.isArray(body.publicKey) ? body.publicKey[0] : body.publicKey;
  return pk?.publicKeyPem ?? null;
}
