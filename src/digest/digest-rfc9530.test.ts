import * as sh from 'structured-headers';
import { RFC9530Prefernece, chooseRFC9530HashAlgorithmByPreference, genRFC9530DigestHeader, verifyRFC9530DigestHeader } from './digest-rfc9530';
import { verifyDigestHeader } from './digest';

const base64Resultes = new Map([
	['{"hello": "world"}\n', {
		'sha-256': 'RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg=',
	}],
	['', {
		'sha-256': '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
		'sha-512': 'z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg==',
	}],
]);

describe('rfc9530', () => {
	test('Want-*-Digest parse', () => {
		const wantDigest = 'sha-256=10, sha-512=3';
		const parsed = sh.parseDictionary(wantDigest) as RFC9530Prefernece;
		expect(parsed).toEqual(new Map([
			['sha-256', [10, new Map()]],
			['sha-512', [3, new Map()]],
		]));
	});
	describe(chooseRFC9530HashAlgorithmByPreference, () => {
		test('case 0', () => {
			const preference = new Map([
				['sha-256', [10, new Map()]],
				['sha-512', [3, new Map()]],
			]) satisfies RFC9530Prefernece;
			const result = chooseRFC9530HashAlgorithmByPreference(preference);
			expect(result).toBe('sha-256');
		});
		test('case 2', () => {
			const preference = new Map([
				['SHA-256', [3, new Map()]],
				['SHA-512', [10, new Map()]],
			]) satisfies RFC9530Prefernece;
			const result = chooseRFC9530HashAlgorithmByPreference(preference);
			expect(result).toBe('sha-512');
		});
		test('case 2', () => {
			const preference = new Map([
				['sha-256', [0, new Map()]],
				['sha-512', [0, new Map()]],
			]) satisfies RFC9530Prefernece;
			const result = chooseRFC9530HashAlgorithmByPreference(preference);
			expect(result).toBe(null);
		});
		test('case 3', () => {
			const preference = new Map([
				['md5', [10, new Map()]],
				['unixsum', [1, new Map()]],
			]) satisfies RFC9530Prefernece;
			const result = chooseRFC9530HashAlgorithmByPreference(preference);
			expect(result).toBe(null);
		});
	});

	describe(genRFC9530DigestHeader, () => {
		test('sha-256', async () => {
			const body = '{"hello": "world"}\n';
			const result = await genRFC9530DigestHeader(body, 'sha-256');
			expect(result).toEqual([
				['sha-256', [new sh.ByteSequence(base64Resultes.get(body)?.['sha-256'] as any), new Map()]]
			]);
			const txt = sh.serializeDictionary(new Map(result));
			expect(txt).toBe('sha-256=:RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg=:');
		});
		test('sha-256, sha-512', async () => {
			const result = await genRFC9530DigestHeader('', ['sha-256', 'sha-512']);
			expect(result).toEqual([
				['sha-256', [new sh.ByteSequence(base64Resultes.get('')?.['sha-256'] as any), new Map()]],
				['sha-512', [new sh.ByteSequence(base64Resultes.get('')?.['sha-512'] as any), new Map()]],
			]);
			const txt = sh.serializeDictionary(new Map(result));
			expect(txt).toBe(`sha-256=:${base64Resultes.get('')?.['sha-256'] as any}:, sha-512=:${base64Resultes.get('')?.['sha-512'] as any}:`);
		});
	});

	describe(verifyRFC9530DigestHeader, () => {
		const body = '{"hello": "world"}\n';
		test('normal', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get(body)?.['sha-256']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, body)).toBe(true);
		});
		test('invalid', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, body)).toBe(false);
		});
		test('no digest', async () => {
			const request = {
				headers: {}
			};
			expect(await verifyRFC9530DigestHeader(request as any, body)).toBe(false);
		});
		test('verify many', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:, sha-512=:${base64Resultes.get('')?.['sha-512']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, '')).toBe(true);
		});
		test('verifyAll fail', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:, sha-512=:${base64Resultes.get(body)?.['sha-512']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, '')).toBe(false);
		});
		test('verify one first algorithm ok', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:, sha-512=:${base64Resultes.get(body)?.['sha-512']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, '', { verifyAll: false, algorithms: ['sha-256', 'sha-512'] })).toBe(true);
		});
		test('verify one first algorithm fail', async () => {
			const request = {
				headers: {
					'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:, sha-512=:${base64Resultes.get(body)?.['sha-512']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, '', { verifyAll: false, algorithms: ['sha-512', 'sha-256'] })).toBe(false);
		});
		test('algorithms missmatch must fail', async () => {
			const request = {
				headers: {
					'content-digest': `sha-512=:${base64Resultes.get('')?.['sha-512']}:`,
				}
			};
			expect(await verifyRFC9530DigestHeader(request as any, '', { algorithms: ['sha-256'] })).toBe(false);
		});

		describe('errors', () => {
			test('algorithms zero fail', async () => {
				const request = {
					headers: {
						'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:`,
					}
				};
				expect(verifyRFC9530DigestHeader(request as any, '', { algorithms: [] })).rejects.toThrow('hashAlgorithms is empty');
			});
			test('algorithm not supported', async () => {
				const request = {
					headers: {
						'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:`,
					}
				};
				expect(verifyRFC9530DigestHeader(request as any, '', { algorithms: ['md5'] })).rejects
					.toThrow('Unsupported hash algorithm detected in opts.hashAlgorithms (supported: sha-256, sha-512)');
			});
		});
	});
});

describe(verifyDigestHeader, () => {
	test('normal', async () => {
		const request = {
			headers: {
				'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:`,
			}
		};
		expect(await verifyDigestHeader(request as any, '')).toBe(true);
	});
	test('fail', async () => {
		const request = {
			headers: {
				'content-digest': `sha-256=:${base64Resultes.get('')?.['sha-256']}:`,
			}
		};
		expect(await verifyDigestHeader(request as any, '', { algorithms: ['SHA-512'] })).toBe(false);
	});
});
