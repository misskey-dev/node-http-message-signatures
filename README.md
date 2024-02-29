@misskey-dev/node-http-message-signatures
----

(WIP) Implementation of [HTTP Signatures "Draft", RFC 9421](https://datatracker.ietf.org/doc/rfc9421/), [RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) for Node.js.

It is created for Misskey's ActivityPub implementation.

## Context
### HTTP Signatures "Draft" and RFC 9421
[RFC 9421](https://datatracker.ietf.org/doc/rfc9421/) is the standard used for signing HTTP communications, but has been used since draft in the world of ActivityPub server-to-server communications with Misskey, Mastodon, and others.
The title "HTTP Signatures" in the draft was changed to "HTTP Message Signatures" in the RFC.

This library allows both the draft and RFC to be used.

### RFC 3230 and RFC 9530
[RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) are standards used for expressing the digest of the body of an HTTP communication. RFC 9530 was released at the same time as RFC 9421 and obsoletes RFC 3230.

Since ActivityPub also needs digest validation, this library also implements functions to create and validate digests.

## Compatibility
### HTTP Message Signatures Implementation Level
As a way of expressing the HTTP Message Signatures support status of software, I propose to express it as an implementation level (a string of two-digit numbers).

~~Newer versions of Misskey have this string in `metadata.httpMessageSignaturesImplementationLevel` of nodeinfo.~~

|Level|Definition|
|:-:|:--|
|`00`|"Draft", RFC 3230, RSA-SHA256 Only|
|`01`|"Draft", RFC 3230, Supports EdDSA|
|`11`|RFC 9421, RFC 9530, Supports EdDSA|

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
import { parseRequest, verifyDraftSignature, verifyDigestHeader } from '@misskey-dev/node-http-message-signatures';

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
fastify.post('/inbox', { confog: { rawBody: true } }, async (request, reply) => {
	const verifyDigest = verifyDigestHeader(request.raw,request.rawBody, true);
	if (!verifyDigest) {
		reply.code(401);
		return;
	}

	// Parse raw request
	const parsedSignature = parseRequest(request.raw);

	if (parsedSignature && parsedSignature.version === 'draft') {

		// Get public key by keyId
		const publicKeyPem = publicKeyMap.get(parsedSignature.keyId)
		if (!publicKeyPem) {
			reply.code(401);
			return;
		}

		// Verify
		const verifyResult = verifyDraftSignature(parsed!.value, keys.rsa4096.publicKey, errorLogger);
		if (!verifyResult) {
			reply.code(401);
			return;
		}
	}

	reply.code(202);
});
```

### Sign and Post
```ts
import { signAsDraftToRequest, genRFC3230DigestHeader, RequestLike } from '@misskey-dev/node-http-message-signatures';

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

export function send(url: string, body: string, keyId: string) {
	const privateKeyPem = privateKeyMap.get(keyId);
	const u = new URL(url);

	const request: RequestLike = {
		headers: {
			Date: (new Date()).toUTCString(),
			Host: u.host,
			Digest: digestHeader,
		},
		method: 'POST',
		url: u.href,
		body,
	};

	if (targetSupportsRFC9421(url)) {
		// TODO
	} else {
		// Draft
		request.headers['Digest'] = genRFC3230DigestHeader(body);

		signAsDraftToRequest(request, { keyId, privateKeyPem }, includeHeaders);

		fetch(u, {
			method: request.method,
			headers: request.headers,
			body,
		});
	}
}
```
