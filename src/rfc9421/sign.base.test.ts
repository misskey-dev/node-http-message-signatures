import { RequestLike, ResponseLike, SFVSignatureInputDictionaryForInput } from '../types';
import { RFC9421SignatureBaseFactory } from './sign';
import * as sh from "structured-headers";

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
			test('header', () => {
				const factory = new RFC9421SignatureBaseFactory(
					requestBase,
					tinySignatureInput,
				);
				expect(factory.get('host')).toBe('example.com');
				expect(factory.get('date')).toBe('Tue, 07 Jun 2014 20:51:35 GMT');

				expect(factory.get('host', { bs: true })).toBe(':ZXhhbXBsZS5jb20=:');
				expect(() => factory.get('host', { bs: true, sf: true })).toThrow();
			});
			test('header canonicalization', () => {
				const request = {
					...requestBase,
					headers: {
						...requestBase.headers,
						'x-obsolete-line-folding': 'value\n\tvalue   \n      value',
						'x-multi-value': ['value1', 'value2'],
						'x-single-array': ['value'],
					},
				} as RequestLike;
				const factory = new RFC9421SignatureBaseFactory(
					request,
					tinySignatureInput,
				);
				expect(factory.get('x-obsolete-line-folding')).toBe('value value value');
				expect(factory.get('x-multi-value')).toBe('value1, value2');
				expect(factory.get('x-single-array')).toBe('value');
			});
			test('sfv header', () => {
				const request = {
					...requestBase,
					headers: {
						...requestBase.headers,
						'x-item-string': '"value"',
						'x-item-token': 'token',
						'x-item-number-a': '123',
						'x-item-number-b': '123.456',
						'x-item-number-c': '-100',
						'x-item-true': '?1',
						'x-item-false': '?0',
						'x-item-binary': ':ZXhhbXBsZS5jb20=:',
						'x-item-with-param': 'value; param="foo"',
						'x-list': '("one" "two" "three")',
					},
				};
				const headerDictionary = {
					'x-item-string': 'item',
					'x-item-token': 'item',
					'x-item-number-a': 'item',
					'x-item-number-b': 'item',
					'x-item-number-c': 'item',
					'x-item-true': 'item',
					'x-item-false': 'item',
					'x-item-binary': 'item',
					'x-item-with-param': 'item',
					'x-list': 'list',
				} as const;
				const factory = new RFC9421SignatureBaseFactory(
					request,
					tinySignatureInput,
					undefined,
					headerDictionary,
				);
				expect(factory.get('x-item-string')).toBe('"value"');
				expect(factory.get('x-item-token')).toBe('token');
				expect(factory.get('x-item-number-a')).toBe('123');
				expect(factory.get('x-item-number-b')).toBe('123.456');
				expect(factory.get('x-item-number-c')).toBe('-100');
				expect(factory.get('x-item-true')).toBe('?1');
				expect(factory.get('x-item-false')).toBe('?0');
				expect(factory.get('x-item-binary')).toBe(':ZXhhbXBsZS5jb20=:');
				expect(factory.get('x-item-with-param')).toBe('value; param="foo"');
				expect(factory.get('x-list')).toBe('("one" "two" "three")');
			});
		});
	});
	describe('generate', () => {
		test('request', () => {
			const input = {
				sig1: [
					[['date', {}], ['@authority', {}]],
					{ keyid: 'https://example.com/users/:id#main-key', algo: 'rsa-pss-sha512' },
				],
			} satisfies SFVSignatureInputDictionaryForInput;
			const factory = new RFC9421SignatureBaseFactory(
				requestBase,
				input,
			);
			expect(factory.generate('sig1')).toBe(
				`"date": ${requestBase.headers.Date}\n` +
				`"@authority": example.com\n` +
				`"@signature-params": ${sh.serializeInnerList(RFC9421SignatureBaseFactory.inputSignatureParamsDictionary(input).get('sig1')!)}`
			);
		});
	});
});
