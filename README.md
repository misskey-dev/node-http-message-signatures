@misskey-dev/node-http-message-signatures
----

(WIP) Implementation of RFC 9421 for Node.js, for Misskey.

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
import { parseRequest, verifyDraftSignature } from '@misskey-dev/node-http-message-signatures';

/**
 * Prepare keyId-publicKeyPem Map
 */
const publicKeyMap = new Map([[ 'test', '-----BEGIN PUBLIC KEY...' ], ... ]);

const fastify = Fastify({
	logger: true,
});
await fastify.register(fastifyRawBody, {
	global: false,
	encoding: null,
	runFirst: true,
});
fastify.post('/inbox', { confog: { rawBody: true } }, async (request, reply) => {
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

### Sign and Post ()
```ts
import { signAsDraftToRequest, RequestLike } from '@misskey-dev/node-http-message-signatures';

/**
 * Prepare keyId-privateKeyPem Map
 */
const privateKeyMap = new Map([
	['https://sender.example.com/users/0001#ed25519-key', '-----BEGIN PRIVATE KEY...' ],
	...
]);

const includeHeaders = ['(request-target)', 'host', 'date', 'accept'];

export function send(url: string, body: string, keyId: string) {
	const privateKeyPem = privateKeyMap.get(keyId);
	const u = new URL(url);

	const request: RequestLike = {
		headers: {
			Date: (new Date()).toUTCString(),
			Host: u.host,
			Accept: '*/*',
		},
		method: 'POST',
		url: u.href,
		body,
	};

	signAsDraftToRequest(request, { keyId, privateKeyPem }, includeHeaders);

	fetch(u, {
		method: request.method,
		headers: request.headers,
		body,
	})
}



```
