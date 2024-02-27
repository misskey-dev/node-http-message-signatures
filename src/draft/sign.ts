import * as crypto from 'crypto';
import { PrivateKey, RequestLike, SignatureAlgorithm, SignatureHashAlgorithm } from '../types';

export function genDraftSigningString(request: RequestLike, includeHeaders: string[]) {
	request.headers = lcObjectKey(request.headers);

	const results: string[] = [];

	for (const key of includeHeaders.map(x => x.toLowerCase())) {
		if (key === '(request-target)') {
			results.push(`(request-target): ${request.method.toLowerCase()} ${new URL(request.url).pathname}`);
		} else {
			results.push(`${key}: ${request.headers[key]}`);
		}
	}

	return results.join('\n');
}

function lcObjectKey(src: Record<string, string>) {
	const dst: Record<string, string> = {};
	for (const key of Object.keys(src).filter(x => x !== '__proto__' && typeof src[x] === 'string')) dst[key.toLowerCase()] = src[key];
	return dst;
}

export function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null) {
	const r = crypto.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
	return r.toString('base64');
}

export function genDraftAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm: SignatureAlgorithm = 'rsa-sha256') {
	return `Signature ${genDraftSignatureHeader(includeHeaders, keyId, signature, hashAlgorithm)}`;
}

export function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: SignatureAlgorithm) {
	return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}

export function getDraftSignatureInfo(privateKeyPem: string, hash: SignatureHashAlgorithm = null) {
	const keyObject = crypto.createPrivateKey(privateKeyPem);

	if (keyObject.asymmetricKeyType === 'rsa') {
		const hashAlgo = hash || 'sha256';
		return {
			keyAlgo: keyObject.asymmetricKeyType,
			hashAlgo,
			algoString: `rsa-${hashAlgo}` as const,
		};
	}
	if (keyObject.asymmetricKeyType === 'ec') {
		const hashAlgo = hash || 'sha256';
		return {
			keyAlgo: keyObject.asymmetricKeyType,
			hashAlgo,
			algoString: `ecdsa-${hashAlgo}` as const,
		};
	}
	if (keyObject.asymmetricKeyType === 'ed25519') {
		return {
			keyAlgo: keyObject.asymmetricKeyType,
			hashAlgo: null,
			algoString: 'ed25519-sha512' as const, // TODO: -sha512付けたくないがjoyent(別実装)が認識しない
		};
	}
	if (keyObject.asymmetricKeyType === 'ed448') {
		return {
			keyAlgo: keyObject.asymmetricKeyType,
			hashAlgo: null,
			algoString: 'ed448' as const,
		};
	}
	throw new Error(`unsupported keyAlgorithm: ${keyObject.asymmetricKeyType}`);
}

export function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts: { hashAlgorithm?: SignatureHashAlgorithm } = {}) {
	const hashAlgorithm = opts?.hashAlgorithm || 'sha256';
	const signatureInfo = getDraftSignatureInfo(key.privateKeyPem, hashAlgorithm);

	const signingString = genDraftSigningString(request, includeHeaders);
	const signature = genDraftSignature(signingString, key.privateKeyPem, signatureInfo.hashAlgo);

	const signatureHeader = genDraftSignatureHeader(includeHeaders, key.keyId, signature, signatureInfo.algoString);

	Object.assign(request.headers, {
		Signature: signatureHeader
	});

	return {
		signingString,
		signature,
		signatureHeader,
	};
}
