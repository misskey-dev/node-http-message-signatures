import * as sf from 'structured-headers';
import { RFC9530Prefernece } from '@/digest/digest-rfc9530.js';

describe('a', () => {
	test('Want-*-Digest parse', () => {
		const wantDigest = 'sha-256=1, sha-512=0.5';
		const parsed = sf.parseDictionary(wantDigest) as RFC9530Prefernece;
		console.log(parsed);
		expect(parsed).toEqual(new Map([
			['sha-256', [1, new Map()]],
			['sha-512', [0.5, new Map()]],
		]));
	});
});
