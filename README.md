@misskey-dev/node-http-message-signatures
----

(WIP) Implementation of [HTTP Signatures "Draft", RFC 9421](https://datatracker.ietf.org/doc/rfc9421/), [RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) for JavaScript.

It is created for Misskey's ActivityPub implementation.

We initially started working on it with the intention of using it in Node.js, but since we rewrote it to Web Crypto API, it may also work in browsers and edge workers.

## Context
### HTTP Signatures "Draft" and RFC 9421
[RFC 9421](https://datatracker.ietf.org/doc/rfc9421/) is the standard used for signing HTTP communications, but has been used since draft in the world of ActivityPub server-to-server communications with Misskey, Mastodon, and others.
The title "HTTP Signatures" in the draft was changed to "HTTP Message Signatures" in the RFC.

This library allows both the draft and RFC to be used.

### RFC 3230 and RFC 9530
[RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) are standards used for expressing the digest of the body of an HTTP communication. RFC 9530 was released at the same time as RFC 9421 and obsoletes RFC 3230.

Since ActivityPub also needs digest validation, this library also implements functions to create and validate digests.

## Comparison
### With http-signature
Previously, we used `http-signature` (`@peertube/http-signature` to be exact) to parse and verify (Draft) signatures, and this library replaces those implementations as well.

This is because `TritonDataCenter/node-sshpk` (formerly `joient/node-sshpk`), on which http-signature depends, is slower than `crypto`.

## ActivityPub Compatibility
One of the motivations for creating this package is to make Misskey compatible with the Ed25519 signature instead of RSA. In doing so, there is a need to ensure compatibility.

### HTTP Message Signatures Implementation Level
As a way of expressing the HTTP Message Signatures support status of software, I propose to express it as an implementation level (`string` of two-digit numbers).

~~Newer versions of Misskey have this string in `metadata.httpMessageSignaturesImplementationLevel` of nodeinfo.~~

|Level|Definition|
|:-:|:--|
|`00`|"Draft", RFC 3230, RSA-SHA256 Only|
|`01`|"Draft", RFC 3230, Supports multiple public keys and Ed25519|
|`10`|RFC 9421, RFC 9530, RSA-SHA256 Only|
|`11`|RFC 9421, RFC 9530, Supports multiple public keys and Ed25519|

### `additionalPublicKeys`
Misskey added the `additionalPublicKeys` property to Actor to allow it to have multiple public keys. This is an array of [publicKey](https://docs.joinmastodon.org/spec/activitypub/#publicKey)s.

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
		{
			"Key": "sec:Key",
			"additionalPublicKeys": "misskey:additionalPublicKeys"
		}
  ],
  "id": "https://misskey.io/users/7rkrarq81i",
  "type": "Person",
  "publicKey": {
    "id": "https://misskey.io/users/7rkrarq81i#main-key",
		"type": "Key",
    "owner": "https://misskey.io/users/7rkrarq81i",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----..."
  },
	"additionalPublicKeys": [{
  	"id": "https://misskey.io/users/7rkrarq81i#ed25519-key",
		"type": "Key",
  	"owner": "https://misskey.io/users/7rkrarq81i",
  	"publicKeyPem": "-----BEGIN PUBLIC KEY-----..."
	}]
}
```

## Usage

### Installation
```
npm install @misskey-dev/node-http-message-signatures
```

### Parse and verify
Parse and verify in fastify web server, implements ActivityPub inbox

```ts
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import {
	verifyDigestHeader,
	parseRequestSignature,
	verifyDraftSignature,
} from '@misskey-dev/node-http-message-signatures';

/**
 * Prepare keyId-publicKeyPem Map
 */
const publicKeyMap = new Map([
	[ 'test', '-----BEGIN PUBLIC KEY...' ],
	...
]);

const fastify = Fastify({
	logger: true,
});
await fastify.register(fastifyRawBody, {
	global: false,
	encoding: null,
	runFirst: true,
});
fastify.post('/inbox', { config: { rawBody: true } }, async (request, reply) => {
	const verifyDigest = await verifyDigestHeader(request.raw, request.rawBody, true);
	if (verifyDigest !== true) {
		reply.code(401);
		return;
	}

	// Parse raw request
	const parsedSignature = parseRequestSignature(request.raw);

	if (parsedSignature && parsedSignature.version === 'draft') {
		// Get public key by keyId
		const publicKeyPem = publicKeyMap.get(parsedSignature.keyId)
		if (!publicKeyPem) {
			reply.code(401);
			return;
		}

		// Verify Signature
		const verifyResult = await verifyDraftSignature(parsed!.value, publicKeyPem);
		if (verifyResult !== true) {
			reply.code(401);
			return;
		}
	}

	reply.code(202);
});
```

### Sign and Post
```ts
import {
	genDigestHeaderBothRFC3230AndRFC9530,
	signAsDraftToRequest,
	RequestLike,
} from '@misskey-dev/node-http-message-signatures';

/**
 * Prepare keyId-privateKeyPem Map
 */
const privateKeyMap = new Map([
	['https://sender.example.com/users/0001#ed25519-key', '-----BEGIN PRIVATE KEY...' ],
	...
]);

function targetSupportsRFC9421(url) {
	return true;
}

const includeHeaders = ['(request-target)', 'date', 'host', 'digest'];

export async function send(url: string | URL, body: string, keyId: string) {
	const privateKeyPem = privateKeyMap.get(keyId);
	const u = new URL(url);

	const request: RequestLike = {
		headers: {
			Date: (new Date()).toUTCString(),
			Host: u.host,
		},
		method: 'POST',
		url: u.href,
		body,
	};

	await genDigestHeaderBothRFC3230AndRFC9530(request, body, 'SHA-256');

	if (targetSupportsRFC9421(url)) {
		// TODO
	} else {
		await signAsDraftToRequest(request, { keyId, privateKeyPem }, includeHeaders);

		fetch(u, {
			method: request.method,
			headers: request.headers,
			body,
		});
	}
}
```
