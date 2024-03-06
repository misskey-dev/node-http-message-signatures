import type { webcrypto } from 'node:crypto';
import type { PrivateKey, RequestLike, SignatureHashAlgorithmUpperSnake } from '../types.js';
import { type SignInfoDefaults, defaultSignInfoDefaults, encodeArrayBufferToBase64, getWebcrypto, normalizeHeaders, genAlgorithmForSignAndVerify } from '../utils.js';
import { importPrivateKey } from '../pem/pkcs8.js';
import { keyHashAlgosForDraftEncofing } from './const.js';

/**
 * Get the algorithm string for draft encoding
 * @param keyAlgorithm Comes from `privateKey.algorithm.name` e.g. 'RSASSA-PKCS1-v1_5'
 * @param hashAlgorithm e.g. 'SHA-256'
 * @returns string e.g. 'rsa-sha256'
 */
export function getDraftAlgoString(keyAlgorithm: string, hashAlgorithm: SignatureHashAlgorithmUpperSnake) {
	const verifyHash = () => {
		if (!hashAlgorithm) throw new Error(`hash is required or must not be null`);
		if (!(hashAlgorithm in keyHashAlgosForDraftEncofing)) throw new Error(`unsupported hash: ${hashAlgorithm}`);
	};
	if (keyAlgorithm === 'RSASSA-PKCS1-v1_5') {
		// https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams
		verifyHash();
		return `rsa-${keyHashAlgosForDraftEncofing[hashAlgorithm!]}`;
	}
	if (keyAlgorithm === 'ECDSA') {
		// https://developer.mozilla.org/en-US/docs/Web/API/EcKeyGenParams
		verifyHash();
		return `ecdsa-${keyHashAlgosForDraftEncofing[hashAlgorithm!]}`;
	}
	if (keyAlgorithm === 'ECDH') {
		// https://developer.mozilla.org/en-US/docs/Web/API/EcKeyGenParams
		verifyHash();
		return `ecdh-${keyHashAlgosForDraftEncofing[hashAlgorithm!]}`;
	}
	if (keyAlgorithm === 'Ed25519') {
		return `ed25519-sha512`; // Joyent/@peertube/http-signatureではこう指定する必要がある
	}
	if (keyAlgorithm === 'Ed448') {
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
	const headers = normalizeHeaders(request.headers);

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

export async function genDraftSignature(privateKey: webcrypto.CryptoKey, signingString: string, defaults: SignInfoDefaults = defaultSignInfoDefaults) {
	const signatureAB = await (await getWebcrypto()).subtle.sign(genAlgorithmForSignAndVerify(privateKey.algorithm, defaults.hash), privateKey, new TextEncoder().encode(signingString));
	return encodeArrayBufferToBase64(signatureAB);
}

export function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string) {
	return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}

/**
 *
 * @param request Request object to sign
 * @param key Private key to sign
 * @param includeHeaders Headers to build the sigining string
 * @param opts
 * @returns result object
 */
export async function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: SignInfoDefaults = defaultSignInfoDefaults) {
	// hashAlgorithm is old name
	if ((opts as any).hashAlgorithm) {
		opts.hash = (opts as any).hashAlgorithm;
	}

	const privateKey = 'privateKey' in key ? key.privateKey : await importPrivateKey(key.privateKeyPem, ['sign'], opts);
	const algoString = getDraftAlgoString(privateKey.algorithm.name, opts.hash);

	const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });

	const signature = await genDraftSignature(privateKey, signingString, opts);
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
