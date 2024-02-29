import * as crypto from 'node:crypto';
import type { SignInfo, SignatureHashAlgorithm } from './types.js';

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
