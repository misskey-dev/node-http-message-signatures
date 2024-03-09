import { genDigestHeaderBothRFC3230AndRFC9530 } from './digest';

describe(genDigestHeaderBothRFC3230AndRFC9530, () => {
	test('add header', async () => {
		const request = {
			headers: {},
		};
		const body = '';
		await genDigestHeaderBothRFC3230AndRFC9530(request as any, body);
		expect(request.headers['Digest']).toBe('SHA-256=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
		expect(request.headers['Content-Digest']).toBe('sha-256=:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=:');
	});
});
