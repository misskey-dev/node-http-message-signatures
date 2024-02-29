import { detectAndVerifyAlgorithm } from '../shared/verify.js';
import * as crypto from 'node:crypto';
import type { DraftParsedSignature } from '../types.js';

export function verifyDraftSignature(parsed: DraftParsedSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	const publicKey = crypto.createPublicKey(publicKeyPem);
	try {
		const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
		return crypto.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, 'base64'));
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
