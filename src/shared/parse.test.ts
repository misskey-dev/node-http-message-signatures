import { ClockSkewInvalidError, SignatureHeaderNotFoundError, checkClockSkew, validateRequestAndGetSignatureHeader } from './parse.js';

const theDate = new Date('2024-02-28T17:44:06.000Z');

describe('parse', () => {
	describe(checkClockSkew, () => {
		test('pass (req has delay, normal)', () => {
			const req = new Date('2024-02-28T17:44:06.000Z');
			const now = new Date('2024-02-28T17:44:07.000Z');
			const result = checkClockSkew(req, now, 300 * 1e3, 2000);
			expect(result).toBe(undefined);
		});
		test('pass (req fast)', () => {
			const req = new Date('2024-02-28T17:44:06.130Z');
			const now = new Date('2024-02-28T17:44:06.080Z');
			const result = checkClockSkew(req, now, 300 * 1e3, 2000);
			expect(result).toBe(undefined);
		});
		test('fail (too delayed)', () => {
			const req = new Date('2024-02-28T17:44:06.000Z');
			const now = new Date('2024-02-28T18:44:06.000Z');
			expect(() => checkClockSkew(req, now, 300 * 1e3, 2000))
				.toThrow('Clock skew is invalid: request="2024-02-28T17:44:06.000Z",now="2024-02-28T18:44:06.000Z",diff="3600000"');
		});
		test('fail (too fast)', () => {
			const req = new Date('2024-02-28T17:44:16.000Z');
			const now = new Date('2024-02-28T17:44:06.500Z');
			expect(() => checkClockSkew(req, now, 300 * 1e3, 2000))
				.toThrow('Clock skew is invalid: request="2024-02-28T17:44:16.000Z",now="2024-02-28T17:44:06.500Z",diff="-9500"');
		});
	});

	describe(validateRequestAndGetSignatureHeader, () => {
		test('normal', () => {
			const request = {
				headers: {
					signature: 'test',
					date: theDate.toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			const result = validateRequestAndGetSignatureHeader(request, { now: theDate });
			expect(result.signatureHeader).toBe('test');
		});
		test('invalid skew', () => {
			const request = {
				headers: {
					signature: 'test',
					date: (new Date(theDate.getTime() + 10000)).toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			expect(() => validateRequestAndGetSignatureHeader(request, { now: theDate })).toThrow(ClockSkewInvalidError);
		});
		test('authorization header', () => {
			const request = {
				headers: {
					authorization: 'Signature test',
					date: theDate.toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			const result = validateRequestAndGetSignatureHeader(request, { now: theDate });
			expect(result.signatureHeader).toBe('test');
		});
		test('no signature', () => {
			const request = {
				headers: {
					date: theDate.toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			expect(() => validateRequestAndGetSignatureHeader(request, { now: theDate })).toThrow(SignatureHeaderNotFoundError);
		});
		test('authorization header, no signature', () => {
			const request = {
				headers: {
					authorization: 'Bearer test',
					date: theDate.toUTCString(),
					host: 'example.com',
					accept: '*/*',
				},
				method: 'GET',
				url: '/foo/bar',
			};
			expect(() => validateRequestAndGetSignatureHeader(request, { now: theDate })).toThrow(SignatureHeaderNotFoundError);
		});
	});
});
