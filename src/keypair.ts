/*
 * SPDX-FileCopyrightText: mei23
 * SPDX-License-Identifier: MIT
 */

import * as crypto from 'node:crypto';
import * as util from 'node:util';

const generateKeyPair = util.promisify(crypto.generateKeyPair);

export async function genRsaKeyPair(modulusLength = 4096) {
	return await generateKeyPair('rsa', {
		modulusLength,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined
		}
	});
}

export type EcCurves
	= 'prime256v1'	// NIST P-256, secp256r1
	| 'secp384r1'	// NIST P-384
	| 'secp521r1'	// NIST P-521
	| 'secp256k1';

export async function genEcKeyPair(namedCurve: EcCurves = 'prime256v1') {
	return await generateKeyPair('ec', {
		namedCurve,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined
		}
	});
}

export async function genEd25519KeyPair() {
	return await generateKeyPair('ed25519', {
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined
		}
	});
}

export async function genEd448KeyPair() {
	return await generateKeyPair('ed448', {
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined
		}
	});
}

/**
 * PKCS1形式かもしれない公開キーをSPKI形式に統一して出力する
 */
export function toSpkiPublicKey(publicKey: string) {
	return crypto.createPublicKey(publicKey).export({
		type: 'spki',
		format: 'pem'
	});
}
