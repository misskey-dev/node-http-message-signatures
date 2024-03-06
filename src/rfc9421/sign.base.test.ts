import { RequestLike, ResponseLike } from '../types';
import { RFC9421SignatureBaseFactory } from './sign';

const requestBase = {
	method: 'GET',
	url: 'https://example.com/resource/1',
	headers: {
		Host: 'example.com',
		Date: 'Tue, 07 Jun 2014 20:51:35 GMT',
	},
} as RequestLike;

const responseBase = {
	req: requestBase,
	status: 200,
	headers: {
		Date: 'Tue, 07 Jun 2014 20:51:35 GMT',
	},
} as ResponseLike;

describe(RFC9421SignatureBaseFactory, () => {
	describe('construct', () => {
		test('request basic', () => {
			const factory = new RFC9421SignatureBaseFactory(
				requestBase,
			);
			expect(factory).toBeInstanceOf(RFC9421SignatureBaseFactory);
			expect(factory.request).toBe(requestBase);
			expect(factory.requestHeaders).toEqual({
				host: 'example.com',
				date: 'Tue, 07 Jun 2014 20:51:35 GMT',
			});
			expect(factory.response).toBeNull();
			expect(factory.scheme).toBe('https');
			expect(factory.targetUri).toBe('https://example.com/resource/1');
			expect(factory.url.href).toBe('https://example.com/resource/1');
		});

		test('request with /resource/1', () => {
			const request = {
				...requestBase,
				url: '/resource/1',
			} satisfies RequestLike;
			const factory = new RFC9421SignatureBaseFactory(
				request,
			);

			expect(factory.scheme).toBe('https');
			expect(factory.targetUri).toBe('https://example.com/resource/1');
			expect(factory.url.href).toBe('https://example.com/resource/1');
		});

		test('response basic', () => {
			const factory = new RFC9421SignatureBaseFactory(
				responseBase,
			);
			expect(factory).toBeInstanceOf(RFC9421SignatureBaseFactory);
			expect(factory.request).toBe(requestBase);
			expect(factory.requestHeaders).toEqual({
				host: 'example.com',
				date: 'Tue, 07 Jun 2014 20:51:35 GMT',
			});
			expect(factory.response).toBe(responseBase);
			expect(factory.scheme).toBe('https');
			expect(factory.targetUri).toBe('https://example.com/resource/1');
			expect(factory.url.href).toBe('https://example.com/resource/1');
		});
	});
});
