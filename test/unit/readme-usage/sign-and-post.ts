/**
 *
 * This is a usage example of generate digest, sign and POST.
 *
 */

import {
	genDigestHeaderBothRFC3230AndRFC9530,
	signAsDraftToRequest,
	RequestLike,
	RFC9421SignSource,
	signAsRFC9421ToRequestOrResponse,
} from '@/index'; // REPLACE with '@misskey-dev/node-http-message-signatures'
import { jest } from '@jest/globals';

import { rsa4096 } from 'test/keys'; // for test
let fetch = jest.fn<typeof globalThis.fetch>(); // for test

/**
 * PREPARE keyId - privateKeyPem Map
 */
const privateKeyMap = new Map([
	['https://sender.example.com/users/0001#ed25519-key', rsa4096.privateKey],
]);

/**
 * For RFC9421
 * See https://datatracker.ietf.org/doc/html/rfc9421#create-sig-input
 *
 * @example
 *	[
 *		'@method',
 *		[
 *			'@query-param',
 *			{ name: 'foo' },
 *		],
 *	]
 */
const identifiers = ['@method', '@authority', '@path', '@query', 'content-digest', 'accept'];
// For Draft
const includeHeaders = ['(request-target)', 'date', 'host', 'digest'];

export async function send(url: string | URL, body: string, keyId: string, rfc9421 = false) {
	// Get private key
	const privateKeyPem = privateKeyMap.get(keyId);
	if (!privateKeyPem) {
		throw new Error('No private key found');
	}

	// Prepare request
	const u = new URL(url);
	const request = {
		headers: {
			Date: (new Date()).toUTCString(),
			Host: u.host,
			Accept: '*/*',
		},
		method: 'POST',
		url: u.href,
		body,
	} satisfies RequestLike;

	// Generate SHA-256 digests and add them to the request header
	await genDigestHeaderBothRFC3230AndRFC9530(request, body, 'SHA-256');

	if (rfc9421) {
		// Define sources
		const sources = {
			sig1: {
				key: {
					// Private key can be CryptoKey (`privateKey`) or PEM string (`privateKeyPem`)
					privateKeyPem: privateKeyPem,
					keyId: keyId,
				},
				defaults: {
					ec: 'DSA',
					hash: 'SHA-256',
				},
				identifiers,
				created: Date.now(),
			},
		} satisfies Record<string, RFC9421SignSource>;

		await signAsRFC9421ToRequestOrResponse(request, sources);
	} else {
		await signAsDraftToRequest(request, { keyId, privateKeyPem }, includeHeaders);
	}

	fetch(u, {
		method: request.method,
		headers: request.headers,
		body,
	});
}

describe('sign and post usage', () => {
	beforeEach(() => {
		fetch = jest.fn<typeof globalThis.fetch>();
	});
	test('rfc9421', async () => {
		const url = 'https://receiver.example.com/foo';
		const body = 'Hello, World!';
		const keyId = 'https://sender.example.com/users/0001#ed25519-key';
		await send(url, body, keyId, true);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
	test('draft', async () => {
		const url = 'https://receiver.example.com/foo';
		const body = 'Hello, World!';
		const keyId = 'https://sender.example.com/users/0001#ed25519-key';
		await send(url, body, keyId, false);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});
