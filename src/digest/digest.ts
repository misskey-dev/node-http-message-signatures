import { DigestHashAlgorithm, IncomingRequest } from "../types.js";
import { collectHeaders, encodeArrayBufferToBase64, isBrowserHeader } from "../utils.js";
import { verifyRFC3230DigestHeader } from "./digest-rfc3230.js";
import { convertHashAlgorithmFromWebCryptoToRFC9530, verifyRFC9530DigestHeader } from "./digest-rfc9530.js";
import { DigestSource, createBase64Digest } from "./utils.js";

export async function genDigestHeaderBothRFC3230AndRFC9530<T extends IncomingRequest>(
	request: T,
	body: DigestSource,
	hashAlgorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
): Promise<void> {
	const base64 = await createBase64Digest(body, hashAlgorithm).then(encodeArrayBufferToBase64);
	const digest = `${hashAlgorithm}=${base64}`;
	const contentDigest = `${convertHashAlgorithmFromWebCryptoToRFC9530(hashAlgorithm)}=:${base64}:`;
	if (isBrowserHeader(request.headers)) {
		request.headers.set('Digest', digest);
		request.headers.set('Content-Digest', contentDigest);
	} else {
		request.headers['Digest'] = digest;
		request.headers['Content-Digest'] = contentDigest;
	}
}

export async function verifyDigestHeader(
	request: IncomingRequest,
	rawBody: DigestSource,
	opts: boolean | {
		/**
		 * If false, return true when no Digest header is found
		 * @default true
		 */
		failOnNoDigest?: boolean,
		/**
		 * Specify hash algorithms you accept (Web Crypto API algorithm names)
		 */
		algorithms: DigestHashAlgorithm[],
		/**
		 * RFC 9530 (Content-Digest) only
		 * If true, verify all digests without not supported algorithms
		 * If false, use the first supported and exisiting algorithm in hashAlgorithms
		 * @default true
		 */
		verifyAll?: boolean,
	} = {
		failOnNoDigest: true,
		algorithms: ['SHA-256', 'SHA-512'],
		verifyAll: true,
	},
	errorLogger?: ((message: any) => any)
) {
	const failOnNoDigest = typeof opts === 'boolean' ? opts : opts.failOnNoDigest;
	const algorithms = typeof opts === 'boolean' ? ['SHA-256', 'SHA-512'] satisfies DigestHashAlgorithm[] : opts.algorithms;
	const verifyAll = typeof opts === 'boolean' ? true : opts.verifyAll;
	const headerKeys = new Set(Object.keys(collectHeaders(request)));

	if (headerKeys.has('content-digest')) {
		return await verifyRFC9530DigestHeader(
			request, rawBody,
			{ failOnNoDigest, verifyAll, algorithms: algorithms.map(convertHashAlgorithmFromWebCryptoToRFC9530) }, errorLogger,
		);
	} else if (headerKeys.has('digest')) {
		return await verifyRFC3230DigestHeader(
			request, rawBody, { failOnNoDigest, algorithms }, errorLogger
		);
	}

	if (failOnNoDigest) {
		if (errorLogger) errorLogger('Content-Digest or Digest header not found');
		return false;
	}
	return true;
}
