import { genKeyImportParams, genVerifyAlgorithm, parseSpki } from './spki-algo';
import { rsa4096, ed25519 } from '../../test/keys';
import { genEcKeyPair } from '../keypair';
import { sign } from 'node:crypto';

const test_buffer = Buffer.from('test');

describe('Parse SPKI for Web', () => {
	test('rsa4096', async () => {
		const parsed = parseSpki(rsa4096.publicKey);
		expect(parsed.algorithm).toBe('1.2.840.113549.1.1.1\nrsaEncryption\nPKCS #1');
		expect(parsed.parameter).toBeNull();

		const importParams = genKeyImportParams(parsed);
		expect(importParams).toEqual({ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' });

		const publicKey = await crypto.subtle.importKey('spki', parsed.der, importParams, true, ['verify']);
		expect((publicKey?.algorithm as any).modulusLength).toBe(4096);

		const signed = sign('sha256', test_buffer, rsa4096.privateKey);

		const verifyAlgorithm = genVerifyAlgorithm(parsed);
		const verify = await crypto.subtle.verify(verifyAlgorithm, publicKey, signed, test_buffer);
		expect(verify).toBe(true);
	});
	test('ed25519', async () => {
		const parsed = parseSpki(ed25519.publicKey);
		expect(parsed.algorithm).toBe('1.3.101.112\ncurveEd25519\nEdDSA 25519 signature algorithm');
		expect(parsed.parameter).toBeNull();

		const importParams = genKeyImportParams(parsed);
		expect(importParams).toEqual({ name: 'Ed25519' });

		const publicKey = await crypto.subtle.importKey('spki', parsed.der, importParams, true, ['verify']);
		expect((publicKey?.algorithm as any).name).toBe('Ed25519');

		const signed = sign(null, test_buffer, ed25519.privateKey);

		const verifyAlgorithm = genVerifyAlgorithm(parsed);
		const verify = await crypto.subtle.verify(verifyAlgorithm, publicKey, signed, test_buffer);
		expect(verify).toBe(true);
	});
	test('ec', async () => {
		const keyPair = await genEcKeyPair('prime256v1');
		const parsed = parseSpki(keyPair.publicKey);
		expect(parsed.algorithm).toBe('1.2.840.10045.2.1\necPublicKey\nANSI X9.62 public key type');
		expect(parsed.parameter).toBe('1.2.840.10045.3.1.7\nprime256v1\nANSI X9.62 named elliptic curve');

		const importParams = genKeyImportParams(parsed);
		expect(importParams).toEqual({ name: 'ECDSA', namedCurve: 'P-256' });

		const publicKey = await crypto.subtle.importKey('spki', parsed.der, importParams, true, ['verify']);
		expect((publicKey?.algorithm as any).name).toBe('ECDSA');

		const signed = sign('sha256', test_buffer, { key: keyPair.privateKey, dsaEncoding: 'ieee-p1363' });

		const verifyAlgorithm = genVerifyAlgorithm(parsed, { hash: 'SHA-256', ec: 'DSA' });
		const verify = await crypto.subtle.verify(verifyAlgorithm, publicKey, signed, test_buffer);
		expect(verify).toBe(true);
	});
	test('invalid input', () => {
		expect(() => parseSpki('めちゃくちゃなデータ')).toThrow();
	});
});

