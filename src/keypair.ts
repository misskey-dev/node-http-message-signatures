/*
 * SPDX-FileCopyrightText: mei23
 * SPDX-License-Identifier: MIT
 */

import { encodeArrayBufferToBase64NonRFC4648, getWebcrypto, splitPer64Chars } from './utils';
import type { ECNamedCurve } from './types';

export async function exportPublicKeyPem(key: CryptoKey) {
	const ab = await (await getWebcrypto()).subtle.exportKey('spki', key);
	return '-----BEGIN PUBLIC KEY-----\n' +
		splitPer64Chars(encodeArrayBufferToBase64NonRFC4648(ab)).join('\n') +
		'\n-----END PUBLIC KEY-----\n';
}

export async function exportPrivateKeyPem(key: CryptoKey) {
	const ab = await (await getWebcrypto()).subtle.exportKey('pkcs8', key);
	return '-----BEGIN PRIVATE KEY-----\n' +
	splitPer64Chars(encodeArrayBufferToBase64NonRFC4648(ab)).join('\n') +
		'\n-----END PRIVATE KEY-----\n';
}

export async function genRsaKeyPair(modulusLength = 4096, keyUsage: KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await (await getWebcrypto()).subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		keyUsage,
	);
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}

export async function genEcKeyPair(namedCurve: ECNamedCurve = 'P-256', keyUsage: KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await (await getWebcrypto()).subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve
		},
		true,
		keyUsage,
	);
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}

export async function genEd25519KeyPair(keyUsage: KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await (await getWebcrypto()).subtle.generateKey(
		{
			name: 'Ed25519',
		},
		true,
		keyUsage,
	) as CryptoKeyPair;
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}

export async function genEd448KeyPair(keyUsage) {
	const keyPair = await (await getWebcrypto()).subtle.generateKey(
		{
			name: 'Ed448',
		},
		true,
		keyUsage,
	) as CryptoKeyPair;
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}
