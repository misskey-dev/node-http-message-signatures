import { collectHeaders, compareUint8Array, encodeArrayBufferToBase64, getHeaderValue } from '../utils.js';
import { DigestSource, createBase64Digest } from './utils.js';
import { DigestHashAlgorithm, IncomingRequest } from '../types.js';
import { base64 } from 'rfc4648';

export async function genRFC3230DigestHeader(body: DigestSource, hashAlgorithm: DigestHashAlgorithm) {
	return `${hashAlgorithm}=${await createBase64Digest(body, hashAlgorithm).then(encodeArrayBufferToBase64)}`;
}

export const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;

/**
 *
 * @param request Incoming request
 * @param rawBody Raw body
 * @param failOnNoDigest If false, return true when no Digest header is found (default: true)
 * @param errorLogger When returing false, called with the error message
 * @returns Promise<boolean>
 */
export async function verifyRFC3230DigestHeader(
	request: IncomingRequest,
	rawBody: DigestSource,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
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
	const value = base64.parse(match[2]);

	const algo = match[1] as DigestHashAlgorithm;
	if (!algo) {
		if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
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
