import { describe, expect, test } from '@jest/globals';
import { parseDraftRequestSignatureHeader, parseDraftRequest } from '@/draft/parse.js';

describe(parseDraftRequestSignatureHeader, () => {
	test('normal', () => {
		const header = 'keyId="test",algorithm="rsa-sha256",headers="(request-target) host date",signature="test"';
		const result = parseDraftRequestSignatureHeader(header);
		expect(result).toEqual({
			keyId: 'test',
			algorithm: 'rsa-sha256',
			headers: '(request-target) host date',
			signature: 'test'
		});
	});
});

describe(parseDraftRequest, () => {
	test('normal', () => {
		const request = {
			headers: {
				signature: 'keyId="test",algorithm="rsa-sha256",headers="(request-target) host date",signature="test"'
			},
			method: 'GET',
			url: '/foo/bar',
		};
		const result = parseDraftRequest(request);
		expect(result).toEqual({
			version: 'draft',
			value: {
				scheme: 'Signature',
				params: {
					keyId: 'test',
					algorithm: 'rsa-sha256',
					headers: ['(request-target)', 'host', 'date'],
					signature: 'test'
				}
			}
		});
	});
});
