import { digestHeaderRegEx, verifyRFC3230DigestHeader } from './digest-rfc3230';
import { verifyDigestHeader } from './digest';
import { createBase64Digest } from './utils';
import { encodeArrayBufferToBase64 } from '../utils';

describe('rfc3230', () => {
	describe('regex', () => {
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
		test('normal SHA-1', async () => {
			const request = {
				headers: {
					'digest': `SHA=${encodeArrayBufferToBase64(await createBase64Digest('foo', 'SHA-1'))}`,
				},
			} as any;
			expect(await verifyRFC3230DigestHeader(request, 'foo', { algorithms: ['SHA-1'] })).toBe(true);
		});
		test('normal SHA-1 fail', async () => {
			const request = {
				headers: {
					'digest': `SHA=${encodeArrayBufferToBase64(await createBase64Digest('foo', 'SHA-1'))}`,
				},
			} as any;
			expect(await verifyRFC3230DigestHeader(request, 'foo', { algorithms: ['SHA-256'] })).toBe(false);
		});
		test('normal SHA-256', async () => {
			const request = {
				headers: {
					'digest': `SHA-256=${encodeArrayBufferToBase64(await createBase64Digest('foo', 'SHA-256'))}`,
				},
			} as any;
			expect(await verifyRFC3230DigestHeader(request, 'foo')).toBe(true);
		});
		test('Unrecognized algorithm name', async () => {
			const request = {
				headers: {
					'digest': `FOO=${encodeArrayBufferToBase64(await createBase64Digest('foo', 'SHA-256'))}`,
				},
			} as any;
			expect(await verifyRFC3230DigestHeader(request, 'foo')).toBe(false);
		});
		test('Invalid base64 padding', async () => {
			const request = {
				headers: {
					'digest': `FOO=abc`,
				},
			} as any;
			expect(await verifyRFC3230DigestHeader(request, 'foo')).toBe(false);
		});
	});
});

describe(verifyDigestHeader, () => {
	test('RFC3230', async () => {
		const request = {
			headers: {
				'digest': `SHA-256=${encodeArrayBufferToBase64(await createBase64Digest('foo', 'SHA-256'))}`,
			},
		} as any;
		expect(await verifyDigestHeader(request, 'foo')).toBe(true);
	});
});
