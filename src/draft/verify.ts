import { detectAndVerifyAlgorithm } from '../shared/verify.js';
import * as ncrypto from 'node:crypto';
import type { ParsedDraftSignature } from '../types.js';
import { genKeyImportParams, genSignOrVerifyAlgorithm, parsePublicKey } from '../pem/spki.js';
import { decodeBase64ToUint8Array } from '../utils.js';

export function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	const publicKey = ncrypto.createPublicKey(publicKeyPem);
	try {
		const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
		if (!detected) return false;
		return ncrypto.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, 'base64'));
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}

/**
 * Experimental
 * @experimental Testing Web Crypto API
 */
export async function webVerifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	try {
		const parsedSpki = parsePublicKey(publicKeyPem);
		const publicKey = await crypto.subtle.importKey('spki', parsedSpki.der, genKeyImportParams(parsedSpki), false, ['verify']);

		const verify = await crypto.subtle.verify(genSignOrVerifyAlgorithm(parsedSpki), publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
