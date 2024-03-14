import { RequestLike, ResponseLike, SFVSignatureInputDictionaryForInput } from '../types';
import { RFC9421SignatureBaseFactory, convertSignatureParamsDictionary } from './base';

const tinySignatureInput = `x=(x)`;
const requestBase = {
	method: 'GET',
	url: 'https://example.com/resource/1',
	headers: {
		Host: 'example.com',
		Date: 'Tue, 07 Jun 2014 20:51:35 GMT',
		'Signature-Input': tinySignatureInput,
	},
} as RequestLike;

const responseBase = {
	req: requestBase,
	statusCode: 200,
	headers: {
		Date: 'Tue, 07 Jun 2024 20:51:35 GMT',
		'Signature-Input': tinySignatureInput,
	},
} as ResponseLike;

describe(RFC9421SignatureBaseFactory, () => {
	describe('input dictionary', () => {
		test('record', () => {
			const result = convertSignatureParamsDictionary({
				sig1: [
					[['@method', {}], ['@query-param', { name: 'foo', hoge: 'fuga' }]],
					{ keyid: 'x', algo: 'rsa-v1_5-sha256' },
				],
			});
			expect(result).toBe(`sig1=("@method" "@query-param";name="foo";hoge="fuga");keyid="x";algo="rsa-v1_5-sha256"`);
		});
		test('array', () => {
			const result = convertSignatureParamsDictionary([
				['sig1', [
					[['@method', []], ['@query-param', [['name', 'foo']]]],
					{ keyid: 'x', algo: 'rsa-v1_5-sha256' },
				]],
			]);
			expect(result).toBe(`sig1=("@method" "@query-param";name="foo");keyid="x";algo="rsa-v1_5-sha256"`);
		});
	});

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
				'signature-input': tinySignatureInput,
			});
			expect(factory.response).toBeNull();
			expect(factory.scheme).toBe('https');
			expect(factory.targetUri).toBe('https://example.com/resource/1');
			expect(factory.url.href).toBe('https://example.com/resource/1');
		});

		test('request with path url', () => {
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

		test('request with invalid headers', () => {
			const request = {
				...requestBase,
				headers: undefined,
			} as any;
			expect(() => new RFC9421SignatureBaseFactory(
				request,
				tinySignatureInput,
			)).toThrow();
		});

		test('request with raw headers', () => {
			const request = {
				...requestBase,
				rawHeaders: [
					...Object.entries(requestBase.headers),
					...['x-test', 'value'],
					...['x-test', 'value2'],
					...['X-Test', null],
				].flat(2),
			} satisfies RequestLike;
			const factory = new RFC9421SignatureBaseFactory(
				request,
			);
			expect(factory.requestHeaders).toEqual({
				date: ['Tue, 07 Jun 2014 20:51:35 GMT'],
				host: ['example.com'],
				'signature-input': [tinySignatureInput],
				'x-test': ['value', 'value2', ''],
			});
		});

		test('request with raw headers (entries)', () => {
			const request = {
				...requestBase,
				rawHeaders: [
					...Object.entries(requestBase.headers),
					['x-test', 'value'],
					['x-test', 'value2'],
					['X-Test', null],
				].flat(2),
			} satisfies RequestLike;
			const factory = new RFC9421SignatureBaseFactory(
				request,
			);
			expect(factory.requestHeaders).toEqual({
				date: ['Tue, 07 Jun 2014 20:51:35 GMT'],
				host: ['example.com'],
				'signature-input': [tinySignatureInput],
				'x-test': ['value', 'value2', ''],
			});
		});

		test('response basic', () => {
			const factory = new RFC9421SignatureBaseFactory(
				responseBase,
				undefined,
				{},
			);
			expect(factory).toBeInstanceOf(RFC9421SignatureBaseFactory);
			expect(factory.request).toBe(requestBase);
			expect(factory.requestHeaders).toEqual({
				host: 'example.com',
				date: 'Tue, 07 Jun 2014 20:51:35 GMT',
				'signature-input': tinySignatureInput,
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
				expect(factory.get('"@method"')).toBe('GET');
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
			test('trailer', () => {
				const request = {
					...requestBase,
					trailers: {
						'x-trailer': 'value',
					},
				} as RequestLike;
				const factory = new RFC9421SignatureBaseFactory(
					request,
					tinySignatureInput,
				);
				expect(factory.get('x-trailer', { tr: true })).toBe('value');
				expect(() => factory.get('date', { tr: true })).toThrow(`Header not found: "date";tr`);
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
				expect(factory.get('x-multi-value', { bs: true })).toBe(':dmFsdWUx:, :dmFsdWUy:');
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
			test('sfv dictionary', () => {
				const request = {
					...requestBase,
					headers: {
						...requestBase.headers,
						'unknown-dict': '  a=1,    b=2;x=1;y=2,   c=(a   b   c)  ',
						'example-dict': '  a=1,    b=2;x=1;y=2,   c=(a   b   c)  ',
					},
				} as RequestLike;
				const factory = new RFC9421SignatureBaseFactory(
					request,
					undefined,
					{ 'example-dict': 'dict' },
				);
				expect(() => factory.get('unknown-dict', { sf: true })).toThrow();
				expect(factory.get('example-dict')).toBe('a=1,    b=2;x=1;y=2,   c=(a   b   c)');
				expect(factory.get('example-dict', { sf: true })).toBe('a=1, b=2;x=1;y=2, c=(a b c)');
				expect(factory.get('example-dict', { key: 'a' })).toBe('1');
				expect(factory.get('example-dict', { key: 'b' })).toBe('2;x=1;y=2');
				expect(factory.get('example-dict', { key: 'c' })).toBe('(a b c)');
				expect(() => factory.get('example-dict', { key: 'c', sf: true } as any)).toThrow();
			});
		});
		describe('response', () => {
			test('header', () => {
				const factory = new RFC9421SignatureBaseFactory(
					responseBase,
					undefined,
					{},
				);
				expect(factory.get('date')).toBe('Tue, 07 Jun 2024 20:51:35 GMT');
				expect(factory.get('@method', { req: true })).toBe('GET');
				expect(factory.get('@status')).toBe('200');
				expect(factory.get('date', { req: true })).toBe('Tue, 07 Jun 2014 20:51:35 GMT');
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
			const request = {
				...requestBase,
				headers: {
					...requestBase.headers,
					'signature-input': convertSignatureParamsDictionary(input),
				},
			};
			const factory = new RFC9421SignatureBaseFactory(
				request,
			);
			expect(factory.generate('sig1')).toBe(
				`"date": ${requestBase.headers.Date}\n` +
				`"@authority": example.com\n` +
				`"@signature-params": ("date" "@authority");keyid="https://example.com/users/:id#main-key";algo="rsa-pss-sha512"`
			);
		});
		test('response', () => {
			const input = {
				sig1: [
					[['date', {}], ['@authority', { req: true }]],
					{ keyid: 'https://example.com/users/:id#main-key', algo: 'rsa-pss-sha512' },
				],
			} satisfies SFVSignatureInputDictionaryForInput;
			const response = {
				...responseBase,
				headers: {
					...responseBase.headers,
					'signature-input': convertSignatureParamsDictionary(input),
				},
			};
			const factory = new RFC9421SignatureBaseFactory(
				response,
				undefined,
				{},
			);
			expect(factory.generate('sig1')).toBe(
				`"date": ${responseBase.headers.Date}\n` +
				`"@authority";req: example.com\n` +
				`"@signature-params": ("date" "@authority";req);keyid="https://example.com/users/:id#main-key";algo="rsa-pss-sha512"`
			);
		});
	});
});
