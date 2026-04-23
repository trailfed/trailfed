// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash, createSign } from 'node:crypto';

/**
 * Sign an outgoing HTTP request with an actor's RSA key
 * (draft-cavage-http-signatures-12, rsa-sha256). Returns the headers to
 * attach to the request: `Host`, `Date`, `Digest`, `Signature`.
 *
 * We always cover `(request-target) host date digest` — the exact tuple
 * Mastodon / Pleroma expect. Body is SHA-256 hashed for the `Digest` header
 * and the signature binds it in, so a MITM can't swap the payload.
 */
export function signOutgoingRequest(params: {
  method: string;
  url: string;
  body: Buffer;
  privateKeyPem: string;
  /** Actor key id, e.g. `https://camp.trailfed.org/actors/stub#main-key`. */
  keyId: string;
  /** Clock source — injectable for tests. */
  now?: () => Date;
}): Record<string, string> {
  const u = new URL(params.url);
  const path = u.pathname + u.search;
  const host = u.host;
  const date = (params.now?.() ?? new Date()).toUTCString();
  const digest = `SHA-256=${createHash('sha256').update(params.body).digest('base64')}`;

  const signingString = [
    `(request-target): ${params.method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `date: ${date}`,
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
    Host: host,
    Date: date,
    Digest: digest,
    Signature: signatureHeader,
  };
}
