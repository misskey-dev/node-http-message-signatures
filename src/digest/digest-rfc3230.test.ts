import { digestHeaderRegEx, verifyRFC3230DigestHeader } from './digest-rfc3230';
import { createBase64Digest } from './utils';

describe('rfc3230', () => {
	describe('regex', () => {
		test('normal MD5', () => {
			const result = digestHeaderRegEx.exec('MD5=foo');
			expect(result).toBeTruthy();
			expect(result![1]).toBe('MD5');
			expect(result![2]).toBe('foo');
		});
		test('normal SHA-1', () => {
			const result = digestHeaderRegEx.exec('SHA=foo');
			expect(result).toBeTruthy();
			expect(result![1]).toBe('SHA');
			expect(result![2]).toBe('foo');
		});
		test('normal SHA-256', () => {
			const result = digestHeaderRegEx.exec('SHA-256=foo');
			expect(result).toBeTruthy();
			expect(result![1]).toBe('SHA-256');
			expect(result![2]).toBe('foo');
		});
		test('multiple', () => {
			const result = digestHeaderRegEx.exec('MD5=foo,SHA-256=bar');
			expect(result).toBeTruthy();
			expect(result![1]).toBe('MD5');
			expect(result![2]).toBe('foo');
		});
		test('invalid', () => {
			const result = digestHeaderRegEx.exec('MD5');
			expect(result).toBeNull();
		});
	});

	describe(verifyRFC3230DigestHeader, () => {
		test('normal MD5', () => {
			const request = {
				headers: {
					'digest': `MD5=${createBase64Digest('foo', 'md5')}`,
				},
			} as any;
			expect(verifyRFC3230DigestHeader(request, 'foo')).toBe(true);
		});
		test('normal SHA-1', () => {
			const request = {
				headers: {
					'digest': `SHA=${createBase64Digest('foo', 'sha1')}`,
				},
			} as any;
			expect(verifyRFC3230DigestHeader(request, 'foo')).toBe(true);
		});
		test('normal SHA-256', () => {
			const request = {
				headers: {
					'digest': `SHA-256=${createBase64Digest('foo', 'sha256')}`,
				},
			} as any;
			expect(verifyRFC3230DigestHeader(request, 'foo')).toBe(true);
		});
	});
});
