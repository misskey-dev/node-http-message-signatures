
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import {
	verifyDigestHeader,
	parseRequestSignature,
	verifyDraftSignature,
	genRFC3230DigestHeader,
	signAsDraftToRequest,
	PrivateKey,
} from '@/index';
import { ed25519 } from 'test/keys';

const body = 'Hello, world!';

describe('draft fastify', () => {
	test('draft fastify', async () => {
		//#region verify logic
		const fastify = Fastify({
			logger: true,
		});
		await fastify.register(fastifyRawBody, {
			global: false,
			encoding: null,
			runFirst: true,
		});
		fastify.post('/inbox', async (request, reply) => {
			const verifyDigest = await verifyDigestHeader(request.raw, body, true);
			if (verifyDigest !== true) {
				reply.code(401);
				return;
			}

			// Parse raw request
			const parsedSignature = parseRequestSignature(request.raw);

			if (parsedSignature && parsedSignature.version === 'draft') {
				// Verify Signature
				const verifyResult = await verifyDraftSignature(parsedSignature.value, ed25519.publicKey);
				if (verifyResult !== true) {
					reply.code(401);
					return;
				}
				reply.code(200);
				return verifyResult;
			}

			reply.code(202);
			return;
		});
		//#endregion

		//#region sign logic
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

		//#region test
		const url = 'http://example.com/inbox';
		const response = await fastify.inject(
			await createRequest(url, body, { keyId: 'test', privateKeyPem: ed25519.privateKey })
		);

		expect(response.body).toBe('true');
		//#endregion
	});
});
