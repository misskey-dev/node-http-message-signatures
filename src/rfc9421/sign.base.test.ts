import { RequestLike, ResponseLike } from '../types';
import { RFC9421SignatureBaseFactory } from './sign';

const tinySignatureInput = `x=(x)`;
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
	describe('input dictionary', () => {
		test('record', () => {
			const result = RFC9421SignatureBaseFactory.inputSignatureParamsDictionary({
				sig1: [
					[['"@method"', {}], ['"@query-param"', { name: 'foo', hoge: 'fuga' }]],
					{ keyid: 'x', algo: 'rsa-v1_5-sha256' },
				],
			});
			expect(result).toEqual(new Map([
				['sig1', [
					[['"@method"', new Map()], ['"@query-param"', new Map([['name', 'foo'], ['hoge', 'fuga']])]],
					new Map([['keyid', 'x'], ['algo', 'rsa-v1_5-sha256']]),
				]],
			]));
		});
		test('array', () => {
			const result = RFC9421SignatureBaseFactory.inputSignatureParamsDictionary([
				['sig1', [
					[['"@method"', []], ['"@query-param"', [['name', 'foo']]]],
					{ keyid: 'x', algo: 'rsa-v1_5-sha256' },
				]],
			]);
			expect(result).toEqual(new Map([
				['sig1', [
					[['"@method"', new Map()], ['"@query-param"', new Map([['name', 'foo']])]],
					new Map([['keyid', 'x'], ['algo', 'rsa-v1_5-sha256']]),
				]],
			]));
		});
	});

	describe('construct', () => {
		test('request basic', () => {
			const factory = new RFC9421SignatureBaseFactory(
				requestBase,
				tinySignatureInput,
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
				tinySignatureInput,
			);

			expect(factory.scheme).toBe('https');
			expect(factory.targetUri).toBe('https://example.com/resource/1');
			expect(factory.url.href).toBe('https://example.com/resource/1');
		});

		test('response basic', () => {
			const factory = new RFC9421SignatureBaseFactory(
				responseBase,
				tinySignatureInput,
				undefined,
				{},
				tinySignatureInput
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

	describe('get', () => {
		describe('request', () => {
			test('derived with no query', () => {
				const factory = new RFC9421SignatureBaseFactory(
					requestBase,
					tinySignatureInput,
				);
				expect(() => factory.get('@signature-params')).toThrow();
				expect(factory.get('@method')).toBe('GET');
				expect(factory.get('@authority')).toBe('example.com');
				expect(factory.get('@scheme')).toBe('https');
				expect(factory.get('@target-uri')).toBe('https://example.com/resource/1');
				expect(factory.get('@request-target')).toBe('get /resource/1');
				expect(factory.get('@path')).toBe('/resource/1');
				expect(factory.get('@query')).toBe('');
				expect(() => factory.get('@query-param')).toThrow();
			});
			test('derived with query', () => {
				const request = {
					...requestBase,
					url: 'https://example.com/resource/1?foo=bar',
				} satisfies RequestLike;
				const factory = new RFC9421SignatureBaseFactory(
					request,
					tinySignatureInput,
				);
				expect(factory.get('@query')).toBe('?foo=bar');
				expect(factory.get('@query-param', new Map([['name', 'foo']]))).toBe('bar');
				expect(factory.get('@query-param', { name: 'foo' })).toBe('bar');
			});
		});
	});
});
