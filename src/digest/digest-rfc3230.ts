import { lcObjectGet } from '../utils';
import { createBase64Digest } from './utils';
import { DigestHashAlgorithm, IncomingRequest } from '../types';
import { BinaryLike } from 'node:crypto';

const digestHashAlgosForEncoding = {
	'sha1': 'SHA',
	'sha256': 'SHA-256',
	'sha384': 'SHA-384',
	'sha512': 'SHA-512',
	'md5': 'MD5',
} as const satisfies Record<DigestHashAlgorithm, string>;

export const digestHashAlgosForDecoding = {
	'SHA': 'sha1',
	'SHA-1': 'sha1',
	'SHA-256': 'sha256',
	'SHA-384': 'sha384',
	'SHA-512': 'sha512',
	'MD5': 'md5',
} as const satisfies Record<string, DigestHashAlgorithm>;

export function genRFC3230DigestHeader(body: string, hashAlgorithm: DigestHashAlgorithm = 'sha256') {
	return `${digestHashAlgosForEncoding[hashAlgorithm]}=${createBase64Digest(body, hashAlgorithm)}`;
}

export const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;

export function verifyRFC3230DigestHeader(
	request: IncomingRequest,
	rawBody: BinaryLike,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
	let digestHeader = lcObjectGet(request.headers, 'digest');
	if (!digestHeader) {
		if (failOnNoDigest) {
			if (errorLogger) errorLogger('Digest header not found');
			return false;
		}
		return true;
	}
	if (Array.isArray(digestHeader)) {
		digestHeader = digestHeader[0];
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

	const algo = digestHashAlgosForDecoding[match[1].toUpperCase()] as DigestHashAlgorithm | undefined;
	if (!algo) {
		if (errorLogger) errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
		return false;
	}

	const hash = createBase64Digest(rawBody, algo);
	if (hash !== value) {
		if (errorLogger) errorLogger(`Digest header hash mismatch`);
		return false;
	}

	return true;
}
