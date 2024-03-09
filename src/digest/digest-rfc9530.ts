import { collectHeaders, compareUint8Array, getHeaderValue } from '../utils.js';
import { DigestSource, createBase64Digest } from './utils.js';
import type { DigestHashAlgorithm, IncomingRequest, OutgoingResponse } from '../types.js';
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

function isSupportedRFC9530HashAlgorithm(algo: string): algo is RFC9530HashAlgorithm {
	return supportedHashAlgorithmsWithRFC9530AndWebCrypto.includes(algo.toLowerCase() as any);
}

function convertHashAlgorithmFromRFC9530ToWebCrypto(algo: RFC9530HashAlgorithm): DigestHashAlgorithm {
	const lowercased = algo.toLowerCase();
	if (lowercased === 'sha-256') return 'SHA-256';
	if (lowercased === 'sha-512') return 'SHA-512';
	throw new Error(`Unsupported hash algorithm: ${algo}`);
}

export function convertHashAlgorithmFromWebCryptoToRFC9530(algo: DigestHashAlgorithm): RFC9530HashAlgorithm {
	const uppercased = algo.toUpperCase();
	if (uppercased === 'SHA-256') return 'sha-256';
	if (uppercased === 'SHA-512') return 'sha-512';
	throw new Error(`Unsupported hash algorithm: ${algo}`);
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

export type RFC9530DigestHeaderObject = [string, [sh.ByteSequence, Map<any, any>]][];

/**
 * Generate single Digest header
 * @param body The body to be hashed
 * @param hashAlgorithm
 *	Supported common to RFC 9530 Registered and SubtleCrypto.digest = Only 'SHA-256' and 'SHA-512'
 * @returns `[[algorithm, [ByteSequence, Map(0)]]]`
 *	To convert to string, use serializeDictionary from structured-headers
 */
export async function genSingleRFC9530DigestHeader(body: DigestSource, hashAlgorithm: string): Promise<RFC9530DigestHeaderObject> {
	if (!isSupportedRFC9530HashAlgorithm(hashAlgorithm)) {
		throw new RFC9530GenerateDigestHeaderError('Unsupported hash algorithm');
	}
	return [
		[
			hashAlgorithm.toLowerCase(),
			[
				new sh.ByteSequence(
					await createBase64Digest(body, convertHashAlgorithmFromRFC9530ToWebCrypto(hashAlgorithm))
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
): Promise<RFC9530DigestHeaderObject> {
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

	const result = [] as RFC9530DigestHeaderObject;
	for (const algo of hashAlgorithms) {
		await genSingleRFC9530DigestHeader(body, algo).then(([v]) => result.push(v));
	}
	return result;
}

/**
 * Verify Content-Digest header (not Repr-Digest)
 * @param request IncomingRequest
 * @param rawBody Raw body
 * @param opts Options
 * @param errorLogger Error logger when verification fails
 * @returns Whether digest is valid with the body
 */
export async function verifyRFC9530DigestHeader(
	request: IncomingRequest | OutgoingResponse,
	rawBody: DigestSource,
	opts: {
		/**
		 * If false, return true when no Digest header is found
		 * @default true
		 */
		failOnNoDigest?: boolean,
		/**
		 * If true, verify all digests without not supported algorithms
		 * If false, use the first supported and exisiting algorithm in hashAlgorithms
		 * @default true
		 */
		verifyAll?: boolean,
		/**
		 * Specify hash algorithms you accept. (RFC 9530 algorithm registries)
		 *
		 * If `verifyAll: false`, it is also used to choose the hash algorithm to verify.
		 * (Younger index is preferred.)
		 */
		algorithms?: RFC9530HashAlgorithm[],
	} = {
		failOnNoDigest: true,
		verifyAll: true,
		algorithms: ['sha-256', 'sha-512'],
	},
	errorLogger?: ((message: any) => any)
) {
	const headers = collectHeaders(request);
	const contentDigestHeader = getHeaderValue(headers, 'content-digest');
	if (!contentDigestHeader) {
		if (opts.failOnNoDigest) {
			if (errorLogger) errorLogger('Repr-Digest or Content-Digest header not found');
			return false;
		}
		return true;
	}

	/**
	 * lowercased
	 */
	let dictionary: RFC9530DigestHeaderObject;
	try {
		dictionary = Array.from(sh.parseDictionary(contentDigestHeader), ([k, v]) => [k.toLowerCase(), v]) as RFC9530DigestHeaderObject;
	} catch (e: any) {
		if (errorLogger) errorLogger('Invalid Digest header');
		return false;
	}

	if (dictionary.length === 0) {
		if (errorLogger) errorLogger('Digest header is empty');
		return false;
	}

	/**
	 * lowercased
	 */
	let acceptableAlgorithms = (opts.algorithms || ['sha-256', 'sha-512']).map(v => v.toLowerCase());
	if (acceptableAlgorithms.length === 0) {
		throw new Error('hashAlgorithms is empty');
	}
	if (acceptableAlgorithms.some(algo => !isSupportedRFC9530HashAlgorithm(algo))) {
		throw new Error(`Unsupported hash algorithm detected in opts.hashAlgorithms (supported: ${supportedHashAlgorithmsWithRFC9530AndWebCrypto.join(', ')})`);
	}
	/**
	 * lowercased (from dictionary)
	 */
	const dictionaryAlgorithms = dictionary.reduce((prev, [k]) => prev.add(k), new Set<string>());
	if (!acceptableAlgorithms.some(v => dictionaryAlgorithms.has(v))) {
		if (errorLogger) errorLogger('No supported Content-Digest header algorithm');
		return false;
	}
	if (!opts.verifyAll) {
		acceptableAlgorithms = [acceptableAlgorithms.find(v => dictionaryAlgorithms.has(v))!];
	}

	const results = await Promise.allSettled(
		dictionary.map(([algo, [value]]) => {
			if (!acceptableAlgorithms.includes(algo.toLowerCase() as RFC9530HashAlgorithm)) {
				return Promise.resolve(null);
			}
			if (!(value instanceof sh.ByteSequence)) {
				return Promise.reject(new Error('Invalid dictionary value type'));
			}
			return createBase64Digest(rawBody, convertHashAlgorithmFromRFC9530ToWebCrypto(algo.toLowerCase() as RFC9530HashAlgorithm))
				.then(hash => compareUint8Array(base64.parse(value.toBase64()), new Uint8Array(hash)));
		})
	);
	if (!results.some(v => v.status === 'fulfilled' && v.value === true)) {
		// 全部fullfilled, nullだとtrueになってしまうので
		if (errorLogger) errorLogger(`No digest(s) matched`);
		return false;
	}
	for (const result of results) {
		if (result.status === 'fulfilled' && result.value === false) {
			if (errorLogger) errorLogger(`Content-Digest header hash simply mismatched`);
			return false;
		} else if (result.status === 'rejected') {
			if (errorLogger) errorLogger(`Content-Digest header parse error: ${result.reason}`);
			return false;
		}
	}
	return true;
}
