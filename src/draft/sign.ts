import * as ncrypto from 'node:crypto';
import type { PrivateKey, RequestLike, SignatureHashAlgorithm } from '../types.js';
import { encodeArrayBufferToBase64, getDraftAlgoString, lcObjectKey, prepareSignInfo, webGetDraftAlgoString } from '../utils.js';
import { parsePkcs8 } from '../pem/pkcs8.js';
import { genKeyImportParams } from '../pem/spki.js';

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

export function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null) {
	const r = ncrypto.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
	return r.toString('base64');
}

export function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string) {
	return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}

export function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: { hashAlgorithm?: SignatureHashAlgorithm; web?: boolean } = {}) {
	const hashAlgorithm = opts?.hashAlgorithm || 'sha256';
	const signInfo = prepareSignInfo(key.privateKeyPem, hashAlgorithm);
	const algoString = getDraftAlgoString(signInfo);

	const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });
	const signature = genDraftSignature(signingString, key.privateKeyPem, signInfo.hashAlg);

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

export async function signAsDraftToRequestWeb(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: { hashAlgorithm?: SignatureHashAlgorithm } = {}) {
	const hash = /**opts?.hashAlgorithm || **/'SHA-256';

	const parsedPrivateKey = parsePkcs8(key.privateKeyPem);
	const importParams = genKeyImportParams(parsedPrivateKey, { hash, ec: 'DSA' });
	const privateKey = await crypto.subtle.importKey('pkcs8', parsedPrivateKey.der, importParams, false, ['sign']);
	const algoString = webGetDraftAlgoString(privateKey);

	const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });
	const signatureAB = await crypto.subtle.sign(importParams, privateKey, new TextEncoder().encode(signingString));
	const signature = encodeArrayBufferToBase64(signatureAB);

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
