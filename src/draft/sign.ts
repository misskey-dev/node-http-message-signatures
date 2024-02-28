import * as crypto from 'node:crypto';
import type { PrivateKey, RequestLike, SignatureAlgorithm, SignatureHashAlgorithm } from '../types.js';
import { getDraftAlgoString, lcObjectKey, prepareSignInfo } from '../utils.js';

export function genDraftSigningString(request: RequestLike, includeHeaders: string[]) {
	request.headers = lcObjectKey(request.headers);

	const results: string[] = [];

	for (const key of includeHeaders.map(x => x.toLowerCase())) {
		if (key === '(request-target)') {
			results.push(`(request-target): ${request.method.toLowerCase()} ${request.url.startsWith('/') ? request.url : new URL(request.url).pathname}`);
		} else {
			if (key === 'date' && !request.headers['date'] && request.headers['x-date']) {
				results.push(`date: ${request.headers['x-date']}`);
			} else {
				results.push(`${key}: ${request.headers[key]}`);
			}
		}
	}

	return results.join('\n');
}

export function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null) {
	const r = crypto.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
	return r.toString('base64');
}

export function genDraftAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm: SignatureAlgorithm = 'rsa-sha256') {
	return `Signature ${genDraftSignatureHeader(includeHeaders, keyId, signature, hashAlgorithm)}`;
}

export function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string) {
	return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}

export function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: { hashAlgorithm?: SignatureHashAlgorithm } = {}) {
	const hashAlgorithm = opts?.hashAlgorithm || 'sha256';
	const signInfo = prepareSignInfo(key.privateKeyPem, hashAlgorithm);

	const signingString = genDraftSigningString(request, includeHeaders);
	const signature = genDraftSignature(signingString, key.privateKeyPem, signInfo.hashAlg);

	const signatureHeader = genDraftSignatureHeader(includeHeaders, key.keyId, signature, getDraftAlgoString(signInfo));

	Object.assign(request.headers, {
		Signature: signatureHeader
	});

	return {
		signingString,
		signature,
		signatureHeader,
	};
}
