import * as crypto from 'node:crypto';
import type { SignInfo, SignatureHashAlgorithm } from './types.js';
import { digestHashAlgosForDecoding } from './digest/digest-rfc3230.js';

/**
 * privateKeyPemからhashAlgorithmを推測する
 *   hashが指定されていない場合、RSAかECの場合はsha256を補完する
 *   ed25519, ed448の場合はhashAlgorithmは常にnull
 */
export function prepareSignInfo(privateKeyPem: string, hash: SignatureHashAlgorithm = null): SignInfo {
	const keyObject = crypto.createPrivateKey(privateKeyPem);

	if (keyObject.asymmetricKeyType === 'rsa') {
		const hashAlgo = hash || 'sha256';
		return {
			keyAlg: keyObject.asymmetricKeyType,
			hashAlg: hashAlgo,
		};
	}
	if (keyObject.asymmetricKeyType === 'ec') {
		const hashAlgo = hash || 'sha256';
		return {
			keyAlg: keyObject.asymmetricKeyType,
			hashAlg: hashAlgo,
		};
	}
	if (keyObject.asymmetricKeyType === 'ed25519') {
		return {
			keyAlg: keyObject.asymmetricKeyType,
			hashAlg: null,
		};
	}
	if (keyObject.asymmetricKeyType === 'ed448') {
		return {
			keyAlg: keyObject.asymmetricKeyType,
			hashAlg: null,
		};
	}
	throw new Error(`unsupported keyAlgorithm: ${keyObject.asymmetricKeyType}`);
}

export function getDraftAlgoString(signInfo: SignInfo) {
	if (signInfo.keyAlg === 'rsa') {
		return `rsa-${signInfo.hashAlg}`;
	}
	if (signInfo.keyAlg === 'ec') {
		return `ecdsa-${signInfo.hashAlg}`;
	}
	if (signInfo.keyAlg === 'ed25519') {
		return 'ed25519-sha512'; // TODO: -sha512付けたくないがjoyent(別実装)が認識しない
	}
	if (signInfo.keyAlg === 'ed448') {
		return 'ed448';
	}
	throw new Error(`unsupported keyAlgorithm`);
}

export function webGetDraftAlgoString(parsed: any /*CryptoKey*/) {
	if (parsed.algorithm.name === 'RSASSA-PKCS1-v1_5') {
		return `rsa-${digestHashAlgosForDecoding[parsed.algorithm.hash]}`;
	}
	if (parsed.algorithm.name === 'ECDSA') {
		return `ecdsa-${digestHashAlgosForDecoding[parsed.algorithm.hash]}`;
	}
	return parsed.algorithm.name.toLowerCase();
}

/**
 * Convert object keys to lowercase
 */
export function lcObjectKey<T extends Record<string, any>>(src: T): T {
	return Object.entries(src).reduce((dst, [key, value]) => {
		if (key === '__proto__') return dst;
		dst[key.toLowerCase()] = value;
		return dst;
	}, {} as any);
}

/**
 * Get value from object, key is case-insensitive
 */
export function lcObjectGet<T extends Record<string, any>>(src: T, key: string): T[keyof T] | undefined {
	key = key.toLowerCase();
	for (const [k, v] of Object.entries(src)) {
		if (k.toLowerCase() === key) return v;
	}
	return undefined;
}

/**
 *  Get the Set of keys of the object, lowercased
 */
export function objectLcKeys<T extends Record<string, any>>(src: T): Set<string> {
	return Object.keys(src).reduce((dst, key) => {
		if (key === '__proto__') return dst;
		dst.add(key.toLowerCase());
		return dst;
	}, new Set<string>() as any);
}

/**
 * convert number to Uint8Array, for ASN.1 length field
 */
export function numberToUint8Array(num: number | bigint): Uint8Array {
	const buf = new ArrayBuffer(8);
	const view = new DataView(buf);
	view.setBigUint64(0, BigInt(num), false);
	const viewUint8Array = new Uint8Array(buf);
	const firstNonZero = viewUint8Array.findIndex((v) => v !== 0);
	return viewUint8Array.slice(firstNonZero);
}

export function genASN1Length(length: number | bigint): Uint8Array {
	if (length < 0x80n) {
		return new Uint8Array([Number(length)]);
	}
	const lengthUint8Array = numberToUint8Array(length);
	return new Uint8Array([0x80 + lengthUint8Array.length, ...lengthUint8Array]);
}

/**
 * For web
 */
export function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
	const uint8Array = new Uint8Array(buffer);
	const binary = String.fromCharCode(...uint8Array);
	return btoa(binary);
}
