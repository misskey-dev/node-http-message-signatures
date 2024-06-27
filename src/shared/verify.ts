/**
 * Verify Request (Parsed)
 */

import type { ECNamedCurve, ParsedSignature, SignInfo } from '../types.js';
import { ParsedAlgorithmIdentifier, getNistCurveFromOid, getPublicKeyAlgorithmNameFromOid } from '../pem/spki.js';
import type { SignatureHashAlgorithmUpperSnake } from '../types.js';
import { keyHashAlgosForDraftDecoding } from '../draft/const.js';
import { verifyDraftSignature } from 'src/draft/verify.js';
import { verifyRFC9421Signature } from 'src/rfc9421/verify.js';

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
export function parseSignInfo(algorithm: string | undefined, real: ParsedAlgorithmIdentifier | CryptoKey['algorithm'], errorLogger?: ((message: any) => any)): SignInfo {
	if (typeof real !== 'object' && typeof real !== 'string') {
		console.error('invalid real', algorithm, real);
		throw new KeyHashValidationError('invalid real');
	}
	algorithm = algorithm?.toLowerCase();
	const realKeyType = typeof real === 'string' ? real
		: 'algorithm' in real ?
			getPublicKeyAlgorithmNameFromOid(real.algorithm)
			: real.name;

	if (realKeyType === 'RSA-PSS') {
		// 公開鍵にこれが使われることはないが、一応
		if (algorithm === 'rsa-pss-sha512') {
			return { name: 'RSA-PSS', hash: 'SHA-512' };
		}
	}

	if (realKeyType === 'RSASSA-PKCS1-v1_5') {
		if (
			!algorithm ||
			algorithm === 'hs2019' || // Draft
			algorithm === 'rsa-sha256' || // Draft
			algorithm === 'rsa-v1_5-sha256' // RFC9421
		) {
			return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
		}
		if (algorithm === 'rsa-pss-sha512') { // RFC9421
			return { name: 'RSA-PSS', hash: 'SHA-512' };
		}

		//#region Draft
		const [parsedName, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new KeyHashValidationError(`unsupported hash(RSASSA-PKCS1-v1_5): ${hash} / ${algorithm}`);
		}
		if (parsedName === 'rsa') {
			return { name: 'RSASSA-PKCS1-v1_5', hash: keyHashAlgosForDraftDecoding[hash] };
		}
		//#endregion
		throw new KeyHashValidationError(buildErrorMessage(algorithm, realKeyType));
	}

	if (realKeyType === 'EC') {
		const namedCurve = 'parameter' in real ? getNistCurveFromOid(real.parameter) : (real as EcKeyGenParams).namedCurve as ECNamedCurve;
		if (!namedCurve) throw new KeyHashValidationError('could not get namedCurve');

		if (
			!algorithm ||
			algorithm === 'hs2019' || // Draft
			algorithm === 'ecdsa-sha256' // Draft
		) {
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve };
		}
		if (algorithm === 'ecdsa-p256-sha256') { // RFC9421
			if (namedCurve !== 'P-256') {
				throw new KeyHashValidationError(`curve is not P-256: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve };
		}
		if (algorithm === 'ecdsa-p384-sha384') { // RFC9421
			if (namedCurve !== 'P-384') {
				throw new KeyHashValidationError(`curve is not P-384: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve };
		}

		//#region Draft
		const [dsaOrDH, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new KeyHashValidationError(`unsupported hash(EC): ${hash}`);
		}
		if (dsaOrDH === 'ecdsa') {
			return { name: 'ECDSA', hash: keyHashAlgosForDraftDecoding[hash], namedCurve };
		}
		if (dsaOrDH === 'ecdh') {
			return { name: 'ECDH', hash: keyHashAlgosForDraftDecoding[hash], namedCurve };
		}
		//#endregion
		throw new KeyHashValidationError(buildErrorMessage(algorithm, realKeyType));
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
		throw new KeyHashValidationError(buildErrorMessage(algorithm, realKeyType));
	}
	if (realKeyType === 'Ed448') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ed448'
		) {
			return { name: 'Ed448' };
		}
		throw new KeyHashValidationError(buildErrorMessage(algorithm, realKeyType));
	}

	throw new KeyHashValidationError(`unsupported keyAlgorithm: ${realKeyType} (provided: ${algorithm})`);
}

export function verifyParsedSignature(parsed: ParsedSignature, key: string | CryptoKey, errorLogger?: ((message: any) => any)): Promise<boolean> {
	if (parsed.version === 'draft') {
		return verifyDraftSignature(parsed.value, key, errorLogger);
	} else if (parsed.version === 'rfc9421') {
		return verifyRFC9421Signature(parsed.value, key, undefined, errorLogger);
	}
	throw new Error(`unsupported parsed signature`);
}
