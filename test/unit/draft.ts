import { describe, expect, test } from '@jest/globals';
import httpSignature from '@peertube/http-signature';

import { genDraftSigningString, signAsDraftToRequest } from '@/draft/sign.js';
import { verifyDraftSignature } from '@/draft/verify.js';
import { parseRequestSignature, ClockSkewInvalidError } from '@/parse.js';
import * as keys from '../keys.js';
import { collectHeaders } from '@/utils.js';
import { importPrivateKey } from '@/pem/pkcs8.js';
import { importPublicKey } from '@/pem/spki.js';
import jest from 'jest-mock';
import { HeadersLike } from '@/types.js';

//#region data
const theDate = new Date('2024-02-28T17:44:06.000Z');

/**
 * Infiniteはエラーになるので1000年にしておく
 */
const ThousandYearsBySeconds = 60/*s*/ * 60/*m*/ * 24/*h*/ * 365/*d*/ * 1000/*y*/;

const getBasicOutgoingRequest = () => ({
	headers: {
		Date: theDate.toUTCString(),
		Host: 'example.com',
		Accept: '*/*',
	} as HeadersLike,
	method: 'GET',
	url: '/foo/bar',
});

const basicIncludeHeaders = ['(request-target)', 'host', 'date', 'accept'];
//#endregion

const errorLogger = (...e: any) => console.error(...e);

describe('draft', () => {
	describe('sign', () => {
		describe(genDraftSigningString, () => {
			test('normal', () => {
				const request = getBasicOutgoingRequest();
				const result = genDraftSigningString(request, basicIncludeHeaders);
				expect(result).toBe('(request-target): get /foo/bar\nhost: example.com\ndate: Wed, 28 Feb 2024 17:44:06 GMT\naccept: */*');
			});
		});
	});

	describe('inegrated', () => {
		describe('rsa-sha256', () => {
			const key = {
				privateKeyPem: keys.rsa4096.privateKey,
				keyId: 'https://example.com/users/012345678abcdef#main-key',
			};
			test('sign', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				expect((request.headers as any)['Signature']).toBe('keyId="https://example.com/users/012345678abcdef#main-key",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="ocCFDJtL100/4ug4nkfTVy17rV/H4gXKwrN9o82g89zEt2012ueg4RYlWwtF1waiRhEGXNXoiIbAsO2k0hFlD8/Vhm6BeRlqpgKzs0bd3XFKTRVIUACyg7efblKJ6o8DU+gdu6SlRx9V08n8i2ZEoLim2N0iMbjmDME9oh8rY8bM8uH3RnRIxpLwCmSLDSaPAop0rPQryZQQwoFhsTPvS9JhiyHmSqU1FiIX3Sz4ExcHFyO9MK/kvFmwMLQDJ3Z64npGACo155vBUahUH0RFe1mwRgHBZPyg3PJHomQXaGxc3Jb3PJL1zMQDAofw/hSB0YlN1WM5EApSUfJieOqdbbDeEf5qfpm3Vza3DVRpvQtSeok+X0TOBh6cPCfYmW7gIxKondxmwdP9d5g3pHXQuASE/bOmogh00+zFJGy7AS35j95rgzEUfjzuWOQDUs5pRnuAUDMQ2Q3+woWJGgp4C1YPdO8dL9pR2sBusZYeeIQieQRJIJib1wiXLyL8qgO3ukrECH8FPON6DKmlA3CcyQfUpFw4pVZUArukUKVGt3g4rH6BDJTVHdbeCvKyxG30tzI4jfbuMpj7Ekrj16gHjKwyhhH5vqcJ19ibeg2SoARmipUfRt+ufZGn3tZX3efaBEaTbOAkFGgG0voJjo1Q3+7EFwreHv2ABKXOJiSAIow="');
			});

			test('verify by itself', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;
				const verifyResult = await verifyDraftSignature(parsed.value, keys.rsa4096.publicKey, errorLogger);
				expect(verifyResult).toBe(true);
			});

			test('sign and verify by itself, by pre-imported key', async () => {
				const privateKeyPreImported = {
					privateKey: await importPrivateKey(key.privateKeyPem),
					keyId: key.keyId,
				};
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, privateKeyPreImported, basicIncludeHeaders);
				expect((request.headers as any)['Signature']).toBe('keyId="https://example.com/users/012345678abcdef#main-key",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="ocCFDJtL100/4ug4nkfTVy17rV/H4gXKwrN9o82g89zEt2012ueg4RYlWwtF1waiRhEGXNXoiIbAsO2k0hFlD8/Vhm6BeRlqpgKzs0bd3XFKTRVIUACyg7efblKJ6o8DU+gdu6SlRx9V08n8i2ZEoLim2N0iMbjmDME9oh8rY8bM8uH3RnRIxpLwCmSLDSaPAop0rPQryZQQwoFhsTPvS9JhiyHmSqU1FiIX3Sz4ExcHFyO9MK/kvFmwMLQDJ3Z64npGACo155vBUahUH0RFe1mwRgHBZPyg3PJHomQXaGxc3Jb3PJL1zMQDAofw/hSB0YlN1WM5EApSUfJieOqdbbDeEf5qfpm3Vza3DVRpvQtSeok+X0TOBh6cPCfYmW7gIxKondxmwdP9d5g3pHXQuASE/bOmogh00+zFJGy7AS35j95rgzEUfjzuWOQDUs5pRnuAUDMQ2Q3+woWJGgp4C1YPdO8dL9pR2sBusZYeeIQieQRJIJib1wiXLyL8qgO3ukrECH8FPON6DKmlA3CcyQfUpFw4pVZUArukUKVGt3g4rH6BDJTVHdbeCvKyxG30tzI4jfbuMpj7Ekrj16gHjKwyhhH5vqcJ19ibeg2SoARmipUfRt+ufZGn3tZX3efaBEaTbOAkFGgG0voJjo1Q3+7EFwreHv2ABKXOJiSAIow="');

				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;
				expect(parsed.value.algorithm).toBe('RSA-SHA256');

				const publicKeyPreImported = await importPublicKey(keys.rsa4096.publicKey, ['verify'], undefined);
				const verifyResult = await verifyDraftSignature(parsed.value, publicKeyPreImported, errorLogger);
				expect(verifyResult).toBe(true);
			});

			test('verify by http-signature', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				request.headers = collectHeaders(request);
				const parsed = httpSignature.parseRequest(request, { clockSkew: ThousandYearsBySeconds });
				const verifyResult = httpSignature.verifySignature(parsed, keys.rsa4096.publicKey, errorLogger);
				expect(verifyResult).toBe(true);
			});

			test('verify by itself (failed)', async () => {
				const request = getBasicOutgoingRequest();
				request.headers = collectHeaders(request);
				(request.headers as any)['signature'] = 'keyId="https://example.com/users/012345678abcdef#main-key",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="aaaaaaaa"';
				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;

				const mockLogger = jest.fn();
				const verifyResult = await verifyDraftSignature(parsed.value, keys.rsa4096.publicKey, mockLogger);
				expect(verifyResult).toBe(false);
				expect(mockLogger).toBeCalled();
			});

			test('verify by http-signature (failed)', () => {
				const request = getBasicOutgoingRequest();
				request.headers = collectHeaders(request);
				(request.headers as any)['signature'] = 'keyId="https://example.com/users/012345678abcdef#main-key",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="aaaaaaaa"';
				const parsed = httpSignature.parseRequest(request, { clockSkew: ThousandYearsBySeconds });
				const verifyResult = httpSignature.verifySignature(parsed, keys.rsa4096.publicKey, errorLogger);
				expect(verifyResult).toBe(false);
			});
		});

		describe('rsa-sha512', () => {
			const key = {
				privateKeyPem: keys.rsa4096.privateKey,
				keyId: 'https://example.com/users/012345678abcdef#main-key',
			};
			test('sign and verify', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders, { hash: 'SHA-512', ec: 'DSA' });
				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;
				expect(parsed.value.algorithm).toBe('RSA-SHA512');
				const verifyResult = await verifyDraftSignature(parsed.value, keys.rsa4096.publicKey, errorLogger);
				expect(verifyResult).toBe(true);
			});
		});

		describe('ed25519', () => {
			const key = {
				privateKeyPem: keys.ed25519.privateKey,
				keyId: 'https://example.com/users/012345678abcdef#ed25519-key',
			};
			test('sign', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				expect((request.headers as any)['Signature']).toBe('keyId="https://example.com/users/012345678abcdef#ed25519-key",algorithm="ed25519-sha512",headers="(request-target) host date accept",signature="nFz8cgJ+p8ImwCokRbfcQj34d1GZn9uw1l+Fu+NvAn268kEvjMMgljtS/SZlnyY3dW0RaXf9Lmz0UVAA0bZXDQ=="');
			});

			test('verify by itself', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;
				const verifyResult = await verifyDraftSignature(parsed.value, keys.ed25519.publicKey, errorLogger);
				expect(verifyResult).toBe(true);
			});

			test('verify by http-signature', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				request.headers = collectHeaders(request);
				const parsed = httpSignature.parseRequest(request, { clockSkew: ThousandYearsBySeconds });
				const verifyResult = httpSignature.verifySignature(parsed, keys.ed25519.publicKey, errorLogger);
				expect(verifyResult).toBe(true);
			});

			test('verify by itself (failed)', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				(request.headers as any)['signature'] = `keyId="https://example.com/users/012345678abcdef#ed25519-key",algorithm="ed25519-sha512",headers="(request-target) host date accept",signature="${Array.from({ length: 86 }, () => 'A').join('')}=="`;
				// Check clock skew error
				expect(() => parseRequestSignature(request)).toThrow(ClockSkewInvalidError);
				const parsed = parseRequestSignature(request, { clockSkew: { now: theDate } });
				expect(parsed.version).toBe('draft');
				if (parsed.version !== 'draft') return;
				const logger = jest.fn();
				const verifyResult = await verifyDraftSignature(parsed.value, keys.ed25519.publicKey, logger);
				expect(verifyResult).toBe(false);
				expect(logger).toBeCalled();
			});
			test('verify by http-signature (failed)', async () => {
				const request = getBasicOutgoingRequest();
				await signAsDraftToRequest(request, key, basicIncludeHeaders);
				request.headers = collectHeaders(request);
				// tweetnaclがバイト数でエラーを吐くため、signatureの長さをちゃんとしたものにしておく
				(request.headers as any)['signature'] = `keyId="https://example.com/users/012345678abcdef#ed25519-key",algorithm="ed25519-sha512",headers="(request-target) host date accept",signature="${Array.from({ length: 86 }, () => 'A').join('')}=="`;
				const parsed = httpSignature.parseRequest(request, { clockSkew: ThousandYearsBySeconds });
				const verifyResult = httpSignature.verifySignature(parsed, keys.ed25519.publicKey, errorLogger);
				expect(verifyResult).toBe(false);
			});
		});
	});
});
