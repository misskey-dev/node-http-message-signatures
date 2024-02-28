import { describe, expect, test } from '@jest/globals';
import { parseDraftRequestSignatureHeader } from '@/draft/parse.js';

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
