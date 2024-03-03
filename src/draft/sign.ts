import type { webcrypto as crypto } from 'node:crypto';
import type { PrivateKey, RequestLike, SignInfo, SignatureHashAlgorithmUpperSnake } from '../types.js';
import { encodeArrayBufferToBase64, genSignInfo, lcObjectKey } from '../utils.js';
import { parsePkcs8 } from '../pem/pkcs8.js';
import { keyHashAlgosForDraftEncofing } from './const.js';

export function getDraftAlgoString(algorithm: SignInfo) {
	const verifyHash = () => {
		// @ts-expect-error hash is required
		if (!algorithm.hash) throw new Error(`hash is required`);
		// @ts-expect-error hash is required
		if (!(algorithm.hash in keyHashAlgosForDraftEncofing)) throw new Error(`unsupported hash: ${algorithm.hash}`);
	};
	if (algorithm.name === 'RSASSA-PKCS1-v1_5') {
		verifyHash();
		return `rsa-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
	}
	if (algorithm.name === 'ECDSA') {
		verifyHash();
		return `ecdsa-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
	}
	if (algorithm.name === 'ECDH') {
		verifyHash();
		return `ecdh-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
	}
	if (algorithm.name === 'Ed25519') {
		return `ed25519-sha512`; // Joyent/@peertube/http-signatureではこう指定する必要がある
	}
	if (algorithm.name === 'Ed448') {
		return `ed448`;
	}
	throw new Error(`unsupported keyAlgorithm`);
}

export function genDraftSigningString(
	request: RequestLike,
	includeHeaders: string[],
	additional?: {
		keyId: string;
		algorithm: string;
		created?: string;
		expires?: string;
		opaque?: string;
	}
) {
	const headers = lcObjectKey(request.headers);

	const results: string[] = [];

	for (const key of includeHeaders.map(x => x.toLowerCase())) {
		if (key === '(request-target)') {
			results.push(`(request-target): ${request.method.toLowerCase()} ${request.url.startsWith('/') ? request.url : new URL(request.url).pathname}`);
		} else if (key === '(keyid)') {
			results.push(`(keyid): ${additional?.keyId}`);
		} else if (key === '(algorithm)') {
			results.push(`(algorithm): ${additional?.algorithm}`);
		}	else if (key === '(created)') {
			results.push(`(created): ${additional?.created}`);
		} else if (key === '(expires)') {
			results.push(`(expires): ${additional?.expires}`);
		} else if (key === '(opaque)') {
			results.push(`(opaque): ${additional?.opaque}`);
		} else {
			if (key === 'date' && !headers['date'] && headers['x-date']) {
				results.push(`date: ${headers['x-date']}`);
			} else {
				results.push(`${key}: ${headers[key]}`);
			}
		}
	}

	return results.join('\n');
}

export async function genDraftSignature(privateKey: crypto.CryptoKey, signingString: string) {
	const signatureAB = await globalThis.crypto.subtle.sign(privateKey.algorithm, privateKey, new TextEncoder().encode(signingString));
	return encodeArrayBufferToBase64(signatureAB);
}

export function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string) {
	return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}

export async function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: { hashAlgorithm?: SignatureHashAlgorithmUpperSnake } = {}) {
	const hash = opts?.hashAlgorithm || 'SHA-256';

	const parsedPrivateKey = parsePkcs8(key.privateKeyPem);
	const importParams = genSignInfo(parsedPrivateKey, { hash, ec: 'DSA' });
	const privateKey = await globalThis.crypto.subtle.importKey('pkcs8', parsedPrivateKey.der, importParams, false, ['sign']);
	const algoString = getDraftAlgoString(importParams);

	const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });

	const signature = await genDraftSignature(privateKey, signingString);
	const signatureHeader = genDraftSignatureHeader(includeHeaders, key.keyId, signature, algoString);

	Object.assign(request.headers, {
		Signature: signatureHeader,
	});

	return {
		signingString,
		signature,
		signatureHeader,
	};
}
