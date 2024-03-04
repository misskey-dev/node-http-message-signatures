/**
 * Verify Request (Parsed)
 */

import type { SignInfo } from '../types.js';
import { ParsedAlgorithmIdentifier, getNistCurveFromOid, getPublicKeyAlgorithmNameFromOid } from '../pem/spki.js';
import type { SignatureHashAlgorithmUpperSnake } from '../types.js';
import { keyHashAlgosForDraftDecoding } from '../draft/const.js';

export class KeyHashValidationError extends Error {
	constructor(message: string) { super(message); }
}

function buildErrorMessage(providedAlgorithm: string, real: string) {
	return `Provided algorithm does not match the public key type: provided=${providedAlgorithm}, real=${real}`;
}

/**
 * 鍵のアルゴリズムと提供されたアルゴリズム(あれば)をもとに、キーとハッシュアルゴリズムをまとめる
 * 呼び出しの公開鍵の種類が提供されたものと一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム
 * @param publicKey 実際の公開鍵
 */
export function parseSignInfo(algorithm: string | undefined, parsed: ParsedAlgorithmIdentifier, errorLogger?: ((message: any) => any)): SignInfo {
	algorithm = algorithm?.toLowerCase();
	const realKeyType = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);

	if (realKeyType === 'RSA-PSS') {
		// 公開鍵にこれが使われることはないが、一応
		if (algorithm === 'rsa-pss-sha512') {
			return { name: 'RSA-PSS', hash: 'SHA-512' };
		}
	}

	if (realKeyType === 'RSASSA-PKCS1-v1_5') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'rsa-sha256' ||
			algorithm === 'rsa-v1_5-sha256' // Draftでこれが使われることはないが、一応
		) {
			return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
		}
		if (algorithm === 'rsa-pss-sha512') {
			return { name: 'RSA-PSS', hash: 'SHA-512' };
		}

		//#region draft parsing
		const [parsedName, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new KeyHashValidationError(`unsupported hash: ${hash}`);
		}
		if (parsedName === 'rsa') {
			return { name: 'RSASSA-PKCS1-v1_5', hash: keyHashAlgosForDraftDecoding[hash] };
		}
		//#endregion
		throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}

	if (realKeyType === 'EC') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ecdsa-sha256'
		) {
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		if (algorithm === 'ecdsa-p256-sha256') {
			const namedCurve = getNistCurveFromOid(parsed.parameter);
			if (namedCurve !== 'P-256') {
				throw new KeyHashValidationError(`curve is not P-256: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: namedCurve };
		}
		if (algorithm === 'ecdsa-p384-sha384') {
			const namedCurve = getNistCurveFromOid(parsed.parameter);
			if (namedCurve !== 'P-384') {
				throw new KeyHashValidationError(`curve is not P-384: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: getNistCurveFromOid(parsed.parameter) };
		}

		//#region draft parsing
		const [dsaOrDH, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new KeyHashValidationError(`unsupported hash: ${hash}`);
		}
		if (dsaOrDH === 'ecdsa') {
			return { name: 'ECDSA', hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		if (dsaOrDH === 'ecdh') {
			return { name: 'ECDH', hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		//#endregion
		throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}

	if (realKeyType === 'Ed25519') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ed25519-sha512' ||
			algorithm === 'ed25519'
		) {
			return { name: 'Ed25519' };
		}
		throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}
	if (realKeyType === 'Ed448') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ed448'
		) {
			return { name: 'Ed448' };
		}
		throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}

	throw new KeyHashValidationError(`unsupported keyAlgorithm: ${realKeyType} (provided: ${algorithm})`);
}
