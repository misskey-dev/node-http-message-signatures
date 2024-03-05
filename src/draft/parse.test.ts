import { parseDraftRequest, parseDraftRequestSignatureHeader, validateAndProcessParsedDraftSignatureHeader } from "./parse";

const theDate = new Date('2024-02-28T17:44:06.000Z');

describe('parse', () => {
	describe(parseDraftRequestSignatureHeader, () => {
		test('basic', () => {
			const header = 'keyId="test",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="test"';
			const result = parseDraftRequestSignatureHeader(header);
			expect(result).toEqual({
				keyId: 'test',
				algorithm: 'rsa-sha256',
				headers: '(request-target) host date accept',
				signature: 'test'
			});
		});

		test('AP Like keyId', () => {
			const header = 'keyId="https://example.com/users/012345678abcdef#main-key",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="test"';
			const result = parseDraftRequestSignatureHeader(header);
			expect(result).toEqual({
				keyId: 'https://example.com/users/012345678abcdef#main-key',
				algorithm: 'rsa-sha256',
				headers: '(request-target) host date accept',
				signature: 'test'
			});
		});
	});

	describe(validateAndProcessParsedDraftSignatureHeader, () => {
		const parsedBase = {
			keyId: 'test',
			algorithm: 'rsa-sha256',
			headers: '(request-target) host date accept',
			signature: 'test'
		};
		test('basic', () => {
			const parsed = {
				...parsedBase
			};
			const result = validateAndProcessParsedDraftSignatureHeader(parsed);
			expect(result).toEqual({
				...parsedBase,
				headers: ['(request-target)', 'host', 'date', 'accept'],
			});
		});
		test('created (success)', () => {
			const parsed = {
				...parsedBase,
				created: Math.floor(theDate.getTime() / 1000).toString(),
			};
			const result = validateAndProcessParsedDraftSignatureHeader(parsed, { clockSkew: { now: theDate } });
			expect(result).toEqual({
				...parsedBase,
				headers: ['(request-target)', 'host', 'date', 'accept'],
				created: Math.floor(theDate.getTime() / 1000).toString(),
			});
		});
		test('created (skew error)', () => {
			const parsed = {
				...parsedBase,
				created: Math.floor(theDate.getTime() / 1000 + 1000).toString(),
			};
			expect(() => validateAndProcessParsedDraftSignatureHeader(parsed, { clockSkew: { now: theDate } })).toThrow();
		});
		test('expires (success)', () => {
			const parsed = {
				...parsedBase,
				expires: Math.floor(theDate.getTime() / 1000 + 1000).toString(),
			};
			const result = validateAndProcessParsedDraftSignatureHeader(parsed, { clockSkew: { now: theDate } });
			expect(result).toEqual({
				...parsedBase,
				headers: ['(request-target)', 'host', 'date', 'accept'],
				expires: Math.floor(theDate.getTime() / 1000 + 1000).toString(),
			});
		});
		test('expires (skew error)', () => {
			const parsed = {
				...parsedBase,
				expires: Math.floor(theDate.getTime() / 1000 - 2000).toString(),
			};
			expect(() => validateAndProcessParsedDraftSignatureHeader(parsed, { clockSkew: { now: theDate } })).toThrow();
		});
		test('requiredComponents (success)', () => {
			const parsed = {
				...parsedBase
			};
			const result = validateAndProcessParsedDraftSignatureHeader(parsed, { requiredComponents: { draft: ['date'] } });
			expect(result).toEqual({
				...parsedBase,
				headers: ['(request-target)', 'host', 'date', 'accept'],
			});
		});
		test('requiredComponents (error)', () => {
			const parsed = {
				...parsedBase
			};
			expect(() => validateAndProcessParsedDraftSignatureHeader(parsed, { requiredComponents: { draft: ['digest'] } })).toThrow();
		});
	});

	describe(parseDraftRequest, () => {
		test('basic sha256', () => {
			const request = {
				headers: {
					signature: 'keyId="test",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="test"',
					date: theDate.toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			const result = parseDraftRequest(request, { clockSkew: { now: theDate } });
			expect(result).toEqual({
				version: 'draft',
				value: {
					scheme: 'Signature',
					params: {
						keyId: 'test',
						algorithm: 'rsa-sha256',
						headers: ['(request-target)', 'host', 'date', 'accept'],
						signature: 'test'
					},
					keyId: 'test',
					algorithm: 'RSA-SHA256',
					signingString: `(request-target): get /foo/bar\nhost: example.com\ndate: ${theDate.toUTCString()}\naccept: */*`,
				},
			});
		});
	});
});
