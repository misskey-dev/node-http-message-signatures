import { HeadersLike } from "@/types";
import { RFC9421SignSource, processSingleRFC9421SignSource } from "@/rfc9421/sign";
import { rsa4096 } from "test/keys";

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

const errorLogger = (message: any) => console.error(message);

describe('RFC9421', () => {
	describe('sign', () => {
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
	});
});
