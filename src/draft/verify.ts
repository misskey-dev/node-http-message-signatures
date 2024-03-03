/**
 * Verify Request (Parsed)
 */

import type { ParsedDraftSignature, SignInfo } from '../types.js';
import { ParsedAlgorithmIdentifier, getNistCurveFromOid, getPublicKeyAlgorithmNameFromOid, parsePublicKey } from '../pem/spki.js';
import { decodeBase64ToUint8Array, genSignInfo } from '../utils.js';
import type { SignatureHashAlgorithmUpperSnake } from '../types.js';
import { keyHashAlgosForDraftDecoding } from './const.js';

export class DraftKeyHashValidationError extends Error {
	constructor(message: string) { super(message); }
}

function buildErrorMessage(providedAlgorithm: string, real: string) {
	return `Provided algorithm does not match the public key type: provided=${providedAlgorithm}, real=${real}`;
}

/**
 * 鍵のアルゴリズムとDraft仕様のalgorithmをもとに、キーとハッシュアルゴリズムをまとめる
 * 呼び出しの公開鍵の種類が提供されたものと一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム（Draft仕様）
 * @param publicKey 実際の公開鍵
 */
export function genSignInfoDraft(algorithm: string | undefined, parsed: ParsedAlgorithmIdentifier, errorLogger?: ((message: any) => any)): SignInfo {
	algorithm = algorithm?.toLowerCase();
	const realKeyType = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);

	if (realKeyType === 'RSASSA-PKCS1-v1_5') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'rsa-sha256' ||
			algorithm === 'rsa-v1_5-sha256' // Draftでこれが使われることはないが、一応
		) {
			return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
		}
		const [parsedName, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new DraftKeyHashValidationError(`unsupported hash: ${hash}`);
		}
		if (parsedName === 'rsa') {
			return { name: 'RSASSA-PKCS1-v1_5', hash: keyHashAlgosForDraftDecoding[hash] };
		}
		throw new DraftKeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}

	if (realKeyType === 'EC') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ecdsa-sha256' ||
			algorithm === 'ecdsa-p256-sha256'
		) {
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		if (algorithm === 'ecdsa-p256-sha256') {
			// Draftでこれが使われることはないが、一応
			const namedCurve = getNistCurveFromOid(parsed.parameter);
			if (namedCurve !== 'P-256') {
				throw new DraftKeyHashValidationError(`curve is not P-256: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: namedCurve };
		}
		if (algorithm === 'ecdsa-p384-sha384') {
			// Draftでこれが使われることはないが、一応
			const namedCurve = getNistCurveFromOid(parsed.parameter);
			if (namedCurve !== 'P-384') {
				throw new DraftKeyHashValidationError(`curve is not P-384: ${namedCurve}`);
			}
			return { name: 'ECDSA', hash: 'SHA-256', namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		const [dsaOrDH, hash] = algorithm.split('-') as [string, SignatureHashAlgorithmUpperSnake];
		if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
			throw new DraftKeyHashValidationError(`unsupported hash: ${hash}`);
		}
		if (dsaOrDH === 'ecdsa') {
			return { name: 'ECDSA', hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		if (dsaOrDH === 'ecdh') {
			return { name: 'ECDH', hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
		}
		throw new DraftKeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
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
		throw new DraftKeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}
	if (realKeyType === 'Ed448') {
		if (
			!algorithm ||
			algorithm === 'hs2019' ||
			algorithm === 'ed448'
		) {
			return { name: 'Ed448' };
		}
		throw new DraftKeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
	}

	throw new DraftKeyHashValidationError(`unsupported keyAlgorithm: ${realKeyType} (provided: ${algorithm})`);
}

/**
 * Verify a draft signature
 */
export async function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	try {
		const parsedSpki = parsePublicKey(publicKeyPem);
		const publicKey = await globalThis.crypto.subtle.importKey('spki', parsedSpki.der, genSignInfo(parsedSpki), false, ['verify']);

		const verify = await globalThis.crypto.subtle.verify(publicKey.algorithm, publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
