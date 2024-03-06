import { getHeaderValue } from '../utils';
import { DigestSource, createBase64Digest } from './utils';
import { DigestHashAlgorithm, IncomingRequest } from '../types';

export async function genRFC3230DigestHeader(body: string, hashAlgorithm: DigestHashAlgorithm) {
	return `${hashAlgorithm}=${await createBase64Digest(body, hashAlgorithm)}`;
}

export const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;

export async function verifyRFC3230DigestHeader(
	request: IncomingRequest,
	rawBody: DigestSource,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
	let digestHeader = getHeaderValue(request.headers, 'digest');
	if (Array.isArray(digestHeader)) {
		digestHeader = digestHeader[0];
	}
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

	const value = match[2];
	if (!value) {
		if (errorLogger) errorLogger('Invalid Digest header format');
		return false;
	}

	const algo = match[1] as DigestHashAlgorithm;
	if (!algo) {
		if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
		return false;
	}

	let hash: string;
	try {
		hash = await createBase64Digest(rawBody, algo);
	} catch (e: any) {
		if (e.name === 'NotSupportedError') {
			if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${algo}`);
			return false;
		}
		throw e;
	}

	if (hash !== value) {
		if (errorLogger) errorLogger(`Digest header hash mismatch`);
		return false;
	}

	return true;
}
