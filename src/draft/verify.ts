import { detectAndVerifyAlgorithm } from '../shared/verify.js';
import * as crypto from 'crypto';

type ParsedSignature = {
	scheme: 'Signature';
	params: {
		keyId: string;
		algorithm?: string;	// 'rsa-sha256'
		headers: string[];	//[ '(request-target)', 'date', 'host', 'digest' ],
		signature: string;
	};
	signingString: string;
	algorithm?: string;	// 'RSA-SHA256'
	keyId: string;
};

export function verifySignature(parsed: ParsedSignature, publicKeyPem: string) {
	const publicKey = crypto.createPublicKey(publicKeyPem);
	const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
	return crypto.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, 'base64'));
}
