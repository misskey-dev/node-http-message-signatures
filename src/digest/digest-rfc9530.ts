import { collectHeaders, getHeaderValue } from '../utils.js';
import { DigestSource, createBase64Digest } from './utils.js';
import type { DigestHashAlgorithm, IncomingRequest } from '../types.js';
import * as sh from 'structured-headers';
import { base64 } from 'rfc4648';

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
export const supportedHashAlgorithmsWithRFC9530AndWebCrypto = ['sha-256', 'sha-512'] satisfies RFC9530HashAlgorithm[];
/**
 * Want-*-Digest parsed by structured-headers.parseDictionary
 * https://datatracker.ietf.org/doc/html/rfc9530#name-integrity-preference-fields
 */
export type RFC9530Prefernece = Map<string, [number, Map<any, any>]>;

function isRFC9530Prefernece(obj: any): obj is RFC9530Prefernece {
	if (!(obj instanceof Map)) return false;
	if (obj.size === 0) return false;
	const zeroth = obj.values().next().value;
	if (!(zeroth instanceof Array)) return false;
	if (zeroth.length !== 2) return false;
	if (typeof zeroth[0] !== 'number') return false;
	if (!(zeroth[1] instanceof Map)) return false;
	return true;
}

/**
 * @param prefernece Prefernece map (Want-*-Digest field parsed by structured-headers.parseDictionary)
 * @param meAcceptable The hash algorithms that You can accept or use
 * @returns
 */
export function chooseRFC9530HashAlgorithmByPreference(
	prefernece: RFC9530Prefernece,
	meAcceptable: RFC9530HashAlgorithm[] = supportedHashAlgorithmsWithRFC9530AndWebCrypto,
): RFC9530HashAlgorithm | null {
	const meAcceptableLower = new Set(meAcceptable.map((v) => v.toLowerCase()));
	const arr = Array.from(
		prefernece.entries(),
		([k, [v]]) => ([k.toLowerCase() as RFC9530HashAlgorithm, v] as const) // 一応lowercaseにしておく
	);
	const res = arr.reduce(([kp, vp], [kc, vc]) => {
		if (!meAcceptableLower.has(kc) || vc === 0) return [kp, vp] as const;
		if (kc == null) return [kp, vp] as const;
		if (vc > vp) {
			return [kc, vc] as const;
		}
		return [kp, vp] as const;
	}, [null, 0] as readonly [RFC9530HashAlgorithm | null, number]);
	return res[0];
}

export type RFC9530ResultObject = [string, [sh.ByteSequence, Map<any, any>]][];

/**
 * Generate single Digest header
 * @param body The body to be hashed
 * @param hashAlgorithm
 *	Supported common to RFC 9530 Registered and SubtleCrypto.digest = Only 'SHA-256' and 'SHA-512'
 * @returns `[[algorithm, [ByteSequence, Map(0)]]]`
 *	To convert to string, use serializeDictionary from structured-headers
 */
export async function genSingleRFC9530DigestHeader(body: DigestSource, hashAlgorithm: string): Promise<RFC9530ResultObject> {
	if (!['SHA-256', 'SHA-512'].includes(hashAlgorithm.toUpperCase())) {
		throw new RFC9530GenerateDigestHeaderError('Unsupported hash algorithm');
	}
	return [
		[
			hashAlgorithm.toLowerCase(),
			[
				new sh.ByteSequence(
					await createBase64Digest(body, hashAlgorithm.toUpperCase() as any)
						.then(data => base64.stringify(new Uint8Array(data)))
				),
				new Map()
			],
		],
	];
}

/**
 * Generate Digest header
 * @param body The body to be hashed
 * @param hashAlgorithms
 *	Supported common to RFC 9530 Registered and SubtleCrypto.digest = Only 'SHA-256' and 'SHA-512'
 * @param process
 *	'concurrent' to use Promise.all, 'sequential' to use for..of
 *	@default 'concurrent'
 * @returns `[algorithm, [ByteSequence, Map(0)]][]`
 *	To convert to string, use serializeDictionary from structured-headers
 */
export async function genRFC9530DigestHeader(
	body: DigestSource,
	hashAlgorithms: string | RFC9530Prefernece | Iterable<string> = ['SHA-256'],
	process: 'concurrent' | 'sequential' = 'concurrent',
): Promise<RFC9530ResultObject> {
	if (typeof hashAlgorithms === 'string') {
		return await genSingleRFC9530DigestHeader(body, hashAlgorithms);
	}

	if (isRFC9530Prefernece(hashAlgorithms)) {
		// Prefernece
		const chosen = chooseRFC9530HashAlgorithmByPreference(hashAlgorithms);
		if (chosen == null) {
			throw new RFC9530GenerateDigestHeaderError('Provided hashAlgorithms does not contain SHA-256 or SHA-512');
		}
		return await genSingleRFC9530DigestHeader(body, chosen);
	}

	if (process === 'concurrent') {
		return await Promise.all(Array.from(
			hashAlgorithms as Iterable<'SHA-256' | 'SHA-512'>,
			(algo) => genSingleRFC9530DigestHeader(body, algo).then(([v]) => v),
		));
	}

	const result = [] as RFC9530ResultObject;
	for (const algo of hashAlgorithms) {
		await genSingleRFC9530DigestHeader(body, algo).then(([v]) => result.push(v));
	}
	return result;
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
