import { collectHeaders, getHeaderValue } from '../utils';
import { DigestSource, createBase64Digest } from './utils';
import type { DigestHashAlgorithm, IncomingRequest } from '../types';
import * as sh from 'structured-headers';

export class RFC9530GenerateDigestHeaderError extends Error {
	constructor(message: string) { super(message); }
}

// https://datatracker.ietf.org/doc/html/rfc9530#name-hash-algorithm-consideratio
export type RFC9530HashAlgorithmStatus = 'Active' | 'Provisional' | 'Deprecated';
export const RFC9530HashAlgorithmRegistry = {
	'sha-512': 'Active',
	'sha-256': 'Active',
	'md5': 'Deprecated',
	'sha': 'Deprecated',
	'unixsum': 'Deprecated',
	'unixcksum': 'Deprecated',
	'adler': 'Deprecated',
	'crc32c': 'Deprecated',
} satisfies Record<string, RFC9530HashAlgorithmStatus>;
export type RFC9530HashAlgorithm = keyof typeof RFC9530HashAlgorithmRegistry;
/**
 * Want-*-Digest parsed by structured-headers.parseDictionary
 * https://datatracker.ietf.org/doc/html/rfc9530#name-integrity-preference-fields
 */
export type RFC9530Prefernece = Map<string, [number, Map<any, any>]>;
export type RFC9530ResultObject = [string, sh.ByteSequence][];

async function genSingle(body: DigestSource, hashAlgorithm: string): Promise<string>;
async function genSingle<T extends 'string'>(body: DigestSource, hashAlgorithm: string, returnType: T): Promise<string>;
async function genSingle<T extends 'object'>(body: DigestSource, hashAlgorithm: string, returnType: T): Promise<RFC9530ResultObject>;
async function genSingle<T extends 'string' | 'object'>(body: DigestSource, hashAlgorithm: string, returnType: T = 'string' as T): Promise<T extends 'string' ? string : RFC9530ResultObject> {
	if (!['SHA-256', 'SHA-512'].includes(hashAlgorithm.toUpperCase())) {
		throw new RFC9530GenerateDigestHeaderError('Unsupported hash algorithm');
	}
	if (returnType === 'string') {
		return `${hashAlgorithm.toLowerCase()}=:${await createBase64Digest(body, hashAlgorithm.toUpperCase() as 'SHA-256' | 'SHA-512')}:`;
	} else if (returnType === 'object') {
		return [
			[hashAlgorithm.toLowerCase(), new sh.ByteSequence(await createBase64Digest(body, hashAlgorithm.toUpperCase() as 'SHA-256' | 'SHA-512'))],
		];
	}
	throw new RFC9530GenerateDigestHeaderError('Invalid returnType');
}

/**
 *
 * @param body The body to be hashed
 * @param hashAlgorithms
 * 	RFC 9530 Registered & SubtleCrypto.digest Supported = Only supports 'SHA-256' and 'SHA-512'
 * 	RFC9530Prefernece: Keys must be lowercase
 * @param options
 * @returns
 */
export async function genRFC9530DigestHeader(body: DigestSource, hashAlgorithms: string | RFC9530Prefernece | Iterable<'SHA-256' | 'SHA-512'>): Promise<string>;
export async function genRFC9530DigestHeader<T extends 'object'>(body: DigestSource, hashAlgorithms: string | RFC9530Prefernece | Iterable<'SHA-256' | 'SHA-512'>, returnType: T, process: 'concurrent' | 'sequential'): Promise<RFC9530ResultObject>;
export async function genRFC9530DigestHeader<T extends 'string'>(body: DigestSource, hashAlgorithms: string | RFC9530Prefernece | Iterable<'SHA-256' | 'SHA-512'>, returnType: T, process: 'concurrent' | 'sequential'): Promise<string>;
export async function genRFC9530DigestHeader<T extends 'string' | 'object'>(
	body: DigestSource,
	hashAlgorithms: string | RFC9530Prefernece | Iterable<'SHA-256' | 'SHA-512'> = ['SHA-256'],
	/**
	 * 'string' to return serialized string, 'object' to return entries
	 * @default 'string'
	 */
	returnType: T = 'string' as T,
	/**
	 * 'concurrent' to use Promise.all, 'sequential' to use for..of
	 * @default 'concurrent'
	 */
	process: 'concurrent' | 'sequential' = 'concurrent',
): Promise<T extends 'string' ? string : RFC9530ResultObject> {
	if (typeof hashAlgorithms === 'string') {
		return await genSingle(body, hashAlgorithms, returnType);
	}

	if (hashAlgorithms instanceof Map) {
		if (hashAlgorithms.size === 0) {
			throw new RFC9530GenerateDigestHeaderError('Empty hashAlgorithms');
		}
		if (Array.isArray(hashAlgorithms.values()[0])) {
			// Prefernece
			// sha-256かsha-512しか対応していないため、凝った実装はしない
			const sha256 = hashAlgorithms.get('sha-256')?.[0];
			const sha512 = hashAlgorithms.get('sha-512')?.[0];
			if (sha256 == null && sha512 == null) {
				throw new RFC9530GenerateDigestHeaderError('Provided hashAlgorithms does not contain SHA-256 or SHA-512');
			}
			if ((sha256 ?? 0) <= (sha512 ?? 0)) {
				return await genSingle(body, 'SHA-256', returnType);
			} else {
				return await genSingle(body, 'SHA-256', returnType);
			}
		}
	}

	if (process === 'concurrent') {
		const result = await Array.from(hashAlgorithms as Iterable<'SHA-256' | 'SHA-512'>, async (algo) => {
			return genSingle(body, algo, 'object');
		});
		return returnType === 'string' ? sh.serializeDictionary(new Map(result)) : result;
	}
}

export const digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;

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
