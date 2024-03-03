import { detectAndVerifyAlgorithm } from '../shared/verify.js';
import * as ncrypto from 'node:crypto';
import type { ParsedDraftSignature } from '../types.js';
import { genKeyImportParams, genVerifyAlgorithm, parsePublicKey } from '../pem/spki.js';

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

const encoder = new TextEncoder();

/**
 * Experimental
 * @experimental Testing Web Crypto API
 */
export async function webVerifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	try {
		const parsedSpki = parsePublicKey(publicKeyPem);
		const publicKey = await crypto.subtle.importKey('spki', parsedSpki.der, genKeyImportParams(parsedSpki), false, ['verify']);
		const verify = await crypto.subtle.verify(genVerifyAlgorithm(parsedSpki), publicKey, encoder.encode(parsed.params.signature), encoder.encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
