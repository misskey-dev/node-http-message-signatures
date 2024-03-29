import { collectHeaders, compareUint8Array, encodeArrayBufferToBase64, getHeaderValue } from '../utils.js';
import { DigestSource, createBase64Digest } from './utils.js';
import { DigestHashAlgorithm, IncomingRequest } from '../types.js';
import { base64 } from 'rfc4648';

export async function genRFC3230DigestHeader(body: DigestSource, hashAlgorithm: DigestHashAlgorithm) {
	return `${hashAlgorithm}=${await createBase64Digest(body, hashAlgorithm).then(encodeArrayBufferToBase64)}`;
}

export const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;

/**
 * @param request Incoming request
 * @param rawBody Raw body
 * @param failOnNoDigest If false, return true when no Digest header is found (default: true)
 * @param errorLogger When returing false, called with the error message
 * @returns Promise<boolean>
 */
export async function verifyRFC3230DigestHeader(
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
	} = {
		failOnNoDigest: true,
		algorithms: ['SHA-256', 'SHA-512'],
	},
	errorLogger?: ((message: any) => any)
) {
	const failOnNoDigest = typeof opts === 'boolean' ? opts : opts.failOnNoDigest;
	/**
	 * UPPERCASED
	 */
	const algorithms = typeof opts === 'boolean' ?
		['SHA-256', 'SHA-512']
		: opts.algorithms.map((algo) => algo.toUpperCase() as DigestHashAlgorithm);
	const digestHeader = getHeaderValue(collectHeaders(request), 'digest');
	if (!digestHeader) {
		if (failOnNoDigest) {
			if (errorLogger) errorLogger('Digest header not found');
			return false;
		}
		return true;
	}

	const match = digestHeader.match(digestHeaderRegEx);
	if (!match) {
		if (errorLogger) errorLogger('Invalid Digest header format');
		return false;
	}

	if (!match[2]) {
		if (errorLogger) errorLogger('Invalid Digest header format');
		return false;
	}

	let value: Uint8Array;
	try {
		value = base64.parse(match[2]);
	} catch {
		if (errorLogger) errorLogger(`Invalid Digest header format. (base64 syntax)`);
		return false;
	}

	/**
	 * UPPERCASED
	 */
	let algo = match[1] as DigestHashAlgorithm;
	if (!algo) {
		if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
		return false;
	}
	algo = algo.toUpperCase() as DigestHashAlgorithm;
	if (!algorithms.includes(algo) && !(algo === 'SHA' && algorithms.includes('SHA-1'))) {
		if (errorLogger) errorLogger(`Unsupported hash algorithm detected in opts.algorithms: ${algo} (supported: ${algorithms.join(', ')})`);
		return false;
	}

	let hash: ArrayBuffer;
	try {
		hash = await createBase64Digest(rawBody, algo);
	} catch (e: any) {
		if (e.name === 'NotSupportedError') {
			if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${algo}`);
			return false;
		}
		throw e;
	}

	if (!compareUint8Array(new Uint8Array(hash), value)) {
		if (errorLogger) errorLogger(`Digest header hash mismatch`);
		return false;
	}

	return true;
}
