import * as crypto from 'node:crypto';
import { genRsaKeyPair, genEd25519KeyPair, genEcKeyPair, genEd448KeyPair } from "./keypair";

describe('gen keypair', () => {
	test('genRsaKeyPair', async () => {
		const keypair1 = await genRsaKeyPair(4096);
		const keypair2 = await genRsaKeyPair(4096);
		expect(keypair1.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair2.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair1.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		expect(keypair2.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		// 違うキーペアが生成されるはず
		expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
		const publicKeyObj1 = crypto.createPublicKey(keypair1.publicKey);
		expect(publicKeyObj1.asymmetricKeyType).toBe('rsa');
		const publicKeyObj2 = crypto.createPublicKey(keypair2.publicKey);
		expect(publicKeyObj2.asymmetricKeyType).toBe('rsa');
	}, 30 * 1000); // GitHub Actionsだと結構長めにとる必要があるらしい

	test('genEd25519KeyPair', async () => {
		const keypair1 = await genEd25519KeyPair();
		const keypair2 = await genEd25519KeyPair();
		expect(keypair1.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair2.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair1.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		expect(keypair2.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		// 違うキーペアが生成されるはず
		expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
		const publicKeyObj1 = crypto.createPublicKey(keypair1.publicKey);
		expect(publicKeyObj1.asymmetricKeyType).toBe('ed25519');
		const publicKeyObj2 = crypto.createPublicKey(keypair2.publicKey);
		expect(publicKeyObj2.asymmetricKeyType).toBe('ed25519');
	});

	test('genEd448KeyPair', async () => {
		const keypair1 = await genEd448KeyPair();
		const keypair2 = await genEd448KeyPair();
		expect(keypair1.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair2.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair1.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		expect(keypair2.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		// 違うキーペアが生成されるはず
		expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
		const publicKeyObj1 = crypto.createPublicKey(keypair1.publicKey);
		expect(publicKeyObj1.asymmetricKeyType).toBe('ed448');
		const publicKeyObj2 = crypto.createPublicKey(keypair2.publicKey);
		expect(publicKeyObj2.asymmetricKeyType).toBe('ed448');
	});

	test('genEcKeyPair', async () => {
		const keypair1 = await genEcKeyPair('P-256');
		const keypair2 = await genEcKeyPair('P-256');
		expect(keypair1.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair2.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
		expect(keypair1.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		expect(keypair2.publicKey).toMatch(/-----END PUBLIC KEY-----\n$/);
		// 違うキーペアが生成されるはず
		expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
		const publicKeyObj1 = crypto.createPublicKey(keypair1.publicKey);
		expect(publicKeyObj1.asymmetricKeyType).toBe('ec');
		expect(publicKeyObj1.asymmetricKeyDetails?.namedCurve).toBe('prime256v1');
		const publicKeyObj2 = crypto.createPublicKey(keypair2.publicKey);
		expect(publicKeyObj2.asymmetricKeyType).toBe('ec');
		expect(publicKeyObj2.asymmetricKeyDetails?.namedCurve).toBe('prime256v1');
	});
});
