/*
 * SPDX-FileCopyrightText: mei23
 * SPDX-License-Identifier: MIT
 */

import type { webcrypto as crypto } from 'node:crypto';
import { encodeArrayBufferToBase64, splitPer64Chars } from './utils';
import { ECNamedCurve } from './types';

export async function exportPublicKeyPem(key: crypto.CryptoKey) {
	const ab = await globalThis.crypto.subtle.exportKey('spki', key);
	return '-----BEGIN PUBLIC KEY-----\n' +
		splitPer64Chars(encodeArrayBufferToBase64(ab)).join('\n') +
		'\n-----END PUBLIC KEY-----\n';
}

export async function exportPrivateKeyPem(key: crypto.CryptoKey) {
	const ab = await globalThis.crypto.subtle.exportKey('pkcs8', key);
	return '-----BEGIN PRIVATE KEY-----\n' +
	splitPer64Chars(encodeArrayBufferToBase64(ab)).join('\n') +
		'\n-----END PRIVATE KEY-----\n';
}

export async function genRsaKeyPair(modulusLength = 4096, keyUsage: crypto.KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await globalThis.crypto.subtle.generateKey(
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

export async function genEcKeyPair(namedCurve: ECNamedCurve = 'P-256', keyUsage: crypto.KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await globalThis.crypto.subtle.generateKey(
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

export async function genEd25519KeyPair(keyUsage: crypto.KeyUsage[] = ['sign', 'verify']) {
	const keyPair = await globalThis.crypto.subtle.generateKey(
		{
			name: 'Ed25519',
		},
		true,
		keyUsage,
	) as crypto.CryptoKeyPair;
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}

export async function genEd448KeyPair(keyUsage) {
	const keyPair = await globalThis.crypto.subtle.generateKey(
		{
			name: 'Ed448',
		},
		true,
		keyUsage,
	) as crypto.CryptoKeyPair;
	return {
		publicKey: await exportPublicKeyPem(keyPair.publicKey),
		privateKey: await exportPrivateKeyPem(keyPair.privateKey)
	};
}
