import { lcObjectKey } from 'src/utils';
import { createDigest } from '../digest';
import { DigestHashAlgorithm, IncomingRequest } from '../types';
import { BinaryLike } from 'node:crypto';

const digestHashAlgos = {
	'sha1': 'SHA-1',
	'sha256': 'SHA-256',
	'sha384': 'SHA-384',
	'sha512': 'SHA-512',
} as const satisfies Record<DigestHashAlgorithm, string>;

export function genDraftDigestHeader(body: string, hashAlgorithm: DigestHashAlgorithm = 'sha256') {
	return `${digestHashAlgos[hashAlgorithm]}=${createDigest(body, hashAlgorithm)}`;
}

const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=(.+)$/;

export function verifyDraftDigestHeader(
	request: IncomingRequest,
	rawBody: BinaryLike,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
	const headers = lcObjectKey(request.headers);
	const digestHeader = headers['digest'];
	if (!digestHeader) {
		if (failOnNoDigest) {
			if (errorLogger) errorLogger('Digest header not found');
			return false;
		}
		return true;
	}
	if (Array.isArray(digestHeader)) {
		if (errorLogger) errorLogger('Multiple Digest headers found');
		return false;
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

	const algo = Object.entries(digestHashAlgos).reduce((acc, [key, value]) => {
		if (value === match[1]) return key as DigestHashAlgorithm;
		return acc;
	}, null as DigestHashAlgorithm | null);
	if (!algo) {
		if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
		return false;
	}

	const hash = createDigest(rawBody, algo);
	if (hash !== value) {
		if (errorLogger) errorLogger(`Digest header hash mismatch`);
		return false;
	}

	return true;
}
