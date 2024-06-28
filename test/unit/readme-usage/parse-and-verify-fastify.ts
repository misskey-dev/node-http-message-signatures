
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import {
	verifyDigestHeader,
	parseRequestSignature,
	verifyParsedSignature,
	ParsedSignature,
} from '@/index'; // REPLACE with '@misskey-dev/node-http-message-signatures'

import { ed25519, rsa4096 } from 'test/keys'; // for test

/**
 * keyId - publicKeyPem Map
 */
const publicKeyMap = new Map([
	['https://sender.example.com/users/0001#main-key', rsa4096.publicKey],
	['https://sender.example.com/users/0001#ed25519-key', ed25519.publicKey],
]);

const fastify = Fastify({
	logger: true,
});
await fastify.register(fastifyRawBody, {
	global: false,
	encoding: null,
	runFirst: true,
});

fastify.post('/inbox', async (request, reply) => {
	const verifyDigest = await verifyDigestHeader(request.raw, request.body, true);
	if (verifyDigest !== true) {
		reply.code(401);
		return;
	}

	// Parse raw request
	let parsedSignature: ParsedSignature;
	try {
		parsedSignature = parseRequestSignature(request.raw);
	} catch (e) {
		reply.code(401);
		return e;
	}

	try {
		// If in production, you may be needed to pick public keys from a database or something
		const result = await verifyParsedSignature(parsedSignature, publicKeyMap, (...args) => console.log(args));
		if (result === true) {
			reply.code(200);
			return 'true';
		}
	} catch (e) {
		reply.code(401);
		return e;
	}
	reply.code(401);
	return 'false';
});

//#region test
const body = 'Hello, world!';

import {
	genRFC3230DigestHeader,
	signAsDraftToRequest,
	PrivateKey,
} from '@/index';

describe('parse and verify usage', () => {		//#region sign logic
	const includeHeaders = ['(request-target)', 'date', 'host', 'digest'];

	async function createRequest(url: string | URL, body: string, key: PrivateKey) {
		const u = new URL(url);

		const request = {
			headers: {
				Date: (new Date()).toUTCString(),
				Host: u.host,
				'Content-Type': 'text/plain',
			},
			method: 'POST',
			url: u.href,
			payload: body,
		} as const;

		// Draft
		request.headers['Digest'] = await genRFC3230DigestHeader(body, 'SHA-256');

		await signAsDraftToRequest(request, key, includeHeaders);

		return request;
	}
	//#endregion

	test('draft fastify', async () => {
		const url = 'http://example.com/inbox';
		const response = await fastify.inject(
			await createRequest(url, body, { keyId: 'https://sender.example.com/users/0001#ed25519-key', privateKeyPem: ed25519.privateKey })
		);

		expect(response.body).toBe('true');
	});

	test('draft fastify invalid', async () => {
		const url = 'http://example.com/inbox';
		const response = await fastify.inject(
			await createRequest(url, body, { keyId: 'https://sender.example.com/users/0001#ed25519-key', privateKeyPem: rsa4096.privateKey })
		);

		expect(response.body).toBe('false');
	});
});
//#endregion
