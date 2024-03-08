import * as sh from 'structured-headers';
import { RFC9530Prefernece, chooseRFC9530HashAlgorithmByPreference, genRFC9530DigestHeader } from './digest-rfc9530';

describe('rfc9530', () => {
	test('Want-*-Digest parse', () => {
		const wantDigest = 'sha-256=10, sha-512=3';
		const parsed = sh.parseDictionary(wantDigest) as RFC9530Prefernece;
		console.log(parsed);
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
			const result = await genRFC9530DigestHeader('{"hello": "world"}\n', 'sha-256');
			expect(result).toEqual([
				['sha-256', [new sh.ByteSequence('RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg='), new Map()]]
			]);
			const txt = sh.serializeDictionary(new Map(result));
			expect(txt).toBe('sha-256=:RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg=:');
		});
		test('sha-256, sha-512', async () => {
			const result = await genRFC9530DigestHeader('', ['sha-256', 'sha-512']);
			expect(result).toEqual([
				['sha-256', [new sh.ByteSequence('47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='), new Map()]],
				['sha-512', [new sh.ByteSequence('z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg=='), new Map()]],
			]);
			const txt = sh.serializeDictionary(new Map(result));
			expect(txt).toBe('sha-256=:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=:, sha-512=:z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg==:');
		});
	});
});
