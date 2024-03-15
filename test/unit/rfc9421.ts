import { HeadersLike, RequestLike } from "@/types";
import { RFC9421SignSource, processSingleRFC9421SignSource, signAsRFC9421ToRequestOrResponse } from "@/rfc9421/sign";
import { ed25519, rsa4096 } from "test/keys";
import { getMap } from "@/utils";
import { parseRFC9421RequestOrResponse } from "@/rfc9421/parse";
import { verifyParsedSignature } from "@/shared/verify";

//#region data
const theDate = new Date('2024-02-28T17:44:06.000Z');

const getBasicRequest = () => ({
	headers: {
		Date: theDate.toUTCString(),
		Host: 'example.com',
		'Content-Digest': 'sha-256=base64',
		Accept: '*/*',
	} as HeadersLike,
	method: 'GET',
	url: '/foo/bar',
});

const basicIdentifiers = ["@method", "@authority", "@path", "@query", "content-digest", "accept"];
//#endregion

describe('RFC9421', () => {
	describe(processSingleRFC9421SignSource, () => {
		test('basic', async () => {
			const source = {
				key: {
					privateKeyPem: rsa4096.privateKey,
					keyId: 'x',
				},
				defaults: {
					ec: 'DSA',
					hash: 'SHA-256',
				},
				identifiers: basicIdentifiers,
				created: 1618884475,
			} as RFC9421SignSource;
			const result = await processSingleRFC9421SignSource(source);
			expect(result).toStrictEqual({
				key: expect.anything(),
				params: [
					basicIdentifiers,
					{
						keyid: 'x',
						alg: 'rsa-v1_5-sha256',
						created: 1618884475,
						expires: undefined,
						nonce: undefined,
						tag: undefined,
					},
				],
			});
		});
		test('with expires', async () => {
			const source = {
				key: {
					privateKeyPem: rsa4096.privateKey,
					keyId: 'x',
				},
				defaults: {
					ec: 'DSA',
					hash: 'SHA-256',
				},
				identifiers: basicIdentifiers,
				created: 1618884475,
				expiresAfter: 600,
			} as RFC9421SignSource;
			const result = await processSingleRFC9421SignSource(source);
			expect(result).toStrictEqual({
				key: expect.anything(),
				params: [
					basicIdentifiers,
					{
						keyid: 'x',
						alg: 'rsa-v1_5-sha256',
						created: 1618884475,
						expires: 1618885075,
						nonce: undefined,
						tag: undefined,
					},
				],
			});
		});
	});

	const sig1ExpectedSign = 'gGI1l9aRpu7oejIDYbTP9oskjnS5rZbWScELpUl2dU80Ct63PFVsAWxJSa102qo3ykUvLf/OgHnmX5qXkrDeG0DXh0DP9m6sD6KzW3sgqDMBzSGMy8sjallfqtZT8u/N0U97/Mkck0GaTUxXNVDjR2iPcIjaA3c04w1Wp4y7Ww8qffRifelX2AUbFut4Pil60GaU1EFs3mDQEBIoOp+T50KQEKnkQpktzU0DshBori2j4gVEQw2hIH/G+gfzTBdUT8o6tvU6FSqGRWJakCOSFImqRLJcCc7NsX1je7O6D3mO8Mtp3tZdVjIYKZn/A45dA9xB0LEnXMQUN/TTIy7VG3uGfKGNV8k6ivvqQwcOf9FPoPmmIo+ejd48/+yosRYB2YdvVzN0h3Y5LiPT58ZKpze4MKxr7LeEcyzkXBd4eo9RK3q6MDRdrSxNRXDLXUQ7GI41aiJY+ginc4ZKpYUPdmFNf2H7HY4NMSPQCt8c0XNYMohA4znKLH4YaqtAUOO2YqupwIHtAzXriG/yCs3l5NvXnS8hXnYd4BM68t/gdxtJy9N66gZilXzDqh6fM7ptLKYHzUpvOfH6uWud3qgJJWcY21iSFfsZ48STrNIoF4/lWYrG4vQAPrDvuq6qH3sOMUpkRzQuITUIa9DqEBebkZdKTGgN30147dV65z4Qwc0=';
	const sig1ExpectedParams = '("@method" "@authority" "@path" "@query" "content-digest" "accept");keyid="x";alg="rsa-v1_5-sha256";created=1618884475';
	const sig2ExpectedSign = 'YP6B1blDYA/Saf5jPUBZYd8LSg2zFCWgzRx8rtyUqSAnK4hRXcTNcwuNSuqiIwcubp1FXRY7toruSN23t+DkCg==';
	const sig2ExpectedParams = '("@method" "@authority" "@path" "@query" "content-digest" "accept");keyid="y";alg="ed25519";created=1618884475';
	const basicSources = {
		sig1: {
			key: {
				privateKeyPem: rsa4096.privateKey,
				keyId: 'x',
			},
			defaults: {
				ec: 'DSA',
				hash: 'SHA-256',
			},
			identifiers: basicIdentifiers,
			created: 1618884475,
		},
	} satisfies Record<string, RFC9421SignSource>;

	const multipleSources = {
		sig1: basicSources.sig1,
		sig2: {
			key: {
				privateKeyPem: ed25519.privateKey,
				keyId: 'y',
			},
			defaults: {
				ec: 'DSA',
				hash: 'SHA-512',
			},
			identifiers: basicIdentifiers,
			created: 1618884475,
		},
	} satisfies Record<string, RFC9421SignSource>;

	describe(signAsRFC9421ToRequestOrResponse, () => {
		test('basic', async () => {
			const request = getBasicRequest();
			await signAsRFC9421ToRequestOrResponse(request, getMap(basicSources));
			expect(request.headers['Signature-Input']).toBe(`sig1=${sig1ExpectedParams}`);
			expect(request.headers['Signature']).toBe(`sig1=:${sig1ExpectedSign}:`);
		});
		test('multiple', async () => {
			const request = getBasicRequest();
			await signAsRFC9421ToRequestOrResponse(request, getMap(multipleSources));
			expect(request.headers['Signature-Input']).toBe(`sig1=${sig1ExpectedParams}, sig2=${sig2ExpectedParams}`);
			expect(request.headers['Signature']).toBe(`sig1=:${sig1ExpectedSign}:, sig2=:${sig2ExpectedSign}:`);
		});
	});

	describe('integrated single', () => {
		let request: RequestLike;
		let result: Awaited<ReturnType<typeof signAsRFC9421ToRequestOrResponse>>;
		beforeAll(async () => {
			request = getBasicRequest();
			result = await signAsRFC9421ToRequestOrResponse(request, getMap(basicSources));
		});
		test('parse (invalid skew fail)', () => {
			expect(() => parseRFC9421RequestOrResponse(request)).toThrow();
		});
		test('parse and verify', async () => {
			const parsed = parseRFC9421RequestOrResponse(request, { clockSkew: { now: theDate } });
			expect(parsed.value).toStrictEqual([
				[
					'sig1',
					{
						algorithm: 'rsa-v1_5-sha256',
						base: result.signatureBases.get('sig1'),
						created: 1618884475,
						expires: undefined,
						keyid: 'x',
						nonce: undefined,
						params: sig1ExpectedParams,
						signature: sig1ExpectedSign,
						tag: undefined,
					},
				],
			]);
			const verified = await verifyParsedSignature(parsed, rsa4096.publicKey);
			expect(verified).toBe(true);
		});

		test('parse (invalid signature verify false)', async () => {
			const invalidSignature = `${Array.from({ length: 86 }, () => 'A').join('')}==`;
			request.headers['Signature'] = `sig1=:${invalidSignature}:`;
			const parsed = parseRFC9421RequestOrResponse(request, { clockSkew: { now: theDate } });
			expect(parsed.value).toStrictEqual([
				[
					'sig1',
					{
						algorithm: 'rsa-v1_5-sha256',
						base: result.signatureBases.get('sig1'),
						created: 1618884475,
						expires: undefined,
						keyid: 'x',
						nonce: undefined,
						params: sig1ExpectedParams,
						signature: invalidSignature,
						tag: undefined,
					},
				],
			]);
			const verified = await verifyParsedSignature(parsed, rsa4096.publicKey);
			expect(verified).toBe(false);
		});
	});

	describe('integrated multiple', () => {
		let request: RequestLike;
		let result: Awaited<ReturnType<typeof signAsRFC9421ToRequestOrResponse>>;
		beforeAll(async () => {
			request = getBasicRequest();
			result = await signAsRFC9421ToRequestOrResponse(request, getMap(multipleSources));
		});
		test('parse and verify', async () => {
			const parsed = parseRFC9421RequestOrResponse(request, { clockSkew: { now: theDate } });
			expect(parsed.value).toStrictEqual([
				[
					'sig1',
					{
						algorithm: 'rsa-v1_5-sha256',
						base: result.signatureBases.get('sig1'),
						created: 1618884475,
						expires: undefined,
						keyid: 'x',
						nonce: undefined,
						params: sig1ExpectedParams,
						signature: sig1ExpectedSign,
						tag: undefined,
					},
				],
				[
					'sig2',
					{
						algorithm: 'ed25519',
						base: result.signatureBases.get('sig2'),
						created: 1618884475,
						expires: undefined,
						keyid: 'y',
						nonce: undefined,
						params: sig2ExpectedParams,
						signature: sig2ExpectedSign,
						tag: undefined,
					},
				],
			]);
			const verified = await verifyParsedSignature(parsed, rsa4096.publicKey);
			expect(verified).toBe(true);
		});
	});
});
