import type { MapLikeObj, SignInfo, SignatureHashAlgorithmUpperSnake, HeadersLike, HeadersValueLike, HeadersValueLikeArrayable } from './types.js';
import { ParsedAlgorithmIdentifier, getNistCurveFromOid, getPublicKeyAlgorithmNameFromOid } from './pem/spki.js';

export async function getWebcrypto() {
	return globalThis.crypto ?? (await import('node:crypto')).webcrypto;
}

export const obsoleteLineFoldingRegEx = /[^\S\r\n]*\r?\n[^\S\r\n]+/g;
/**
 * RFC 9421 2.1 (3. Remove any obsolete line folding...) for HTTP/1.1
 */
export function removeObsoleteLineFolding(str: string): string {
	return str.replaceAll(obsoleteLineFoldingRegEx, ' ');
}

/**
 * RFC 9421 2.1 (If the correctly combined value is not directly available for a given field by an implementation, ...)
 */
export function canonicalizeHeaderValue(value: HeadersValueLikeArrayable): string {
	if (typeof value === 'number') return value.toString();
	if (!value) return '';
	if (typeof value === 'string') return removeObsoleteLineFolding(value).trim();
	if (Array.isArray(value)) {
		return value.map(v => {
			if (v == null) return '';
			if (typeof v === 'number') return v.toString();
			if (typeof v === 'string') return removeObsoleteLineFolding(v).trim();
			throw new Error(`Invalid header value type ${v}`);
		}).join(', ');
	}
	throw new Error(`Invalid header value type ${value}`);
}

/**
 * Convert object keys to lowercase
 * (Headers in Fetch API joins multiple headers with ',', but it must be ', ' in RFC 9421)
 */
export function normalizeHeaders<T extends HeadersLike>(src: T): Record<string, string> {
	return Object.entries(src).reduce((dst, [key, value]) => {
		if (key === '__proto__') return dst;
		dst[key.toLowerCase()] = canonicalizeHeaderValue(value);
		return dst;
	}, {} as any);
}

/**
 * Convert object keys to lowercase
 */
export function lcObjectKey<T extends Record<string, any>>(src: T): T {
	return Object.entries(src).reduce((dst, [key, value]) => {
		if (key === '__proto__') return dst;
		dst[key.toLowerCase()] = value;
		return dst;
	}, {} as any);
}

/**
 * Get value from object, key is case-insensitive, with canonicalization
 */
export function getHeaderValue<T extends HeadersLike>(src: T, key: string): string | undefined {
	key = key.toLowerCase();
	for (const [k, v] of Object.entries(src)) {
		if (k.toLowerCase() === key) {
			return canonicalizeHeaderValue(v);
		}
	}
	return undefined;
}

/**
 * Get value from object, key is case-insensitive
 */
export function getValueByLc<T extends Record<string, any>>(src: T, key: string): T[keyof T] | undefined {
	key = key.toLowerCase();
	for (const [k, v] of Object.entries(src)) {
		if (k.toLowerCase() === key) {
			return v;
		}
	}
	return undefined;
}

/**
 *  Get the Set of keys of the object, lowercased
 */
export function objectLcKeys<T extends HeadersLike>(src: T): Set<string> {
	return Object.keys(src).reduce((dst, key) => {
		if (key === '__proto__') return dst;
		dst.add(key.toLowerCase());
		return dst;
	}, new Set<string>() as any);
}

export function toStringOrToLc(src: string | number | undefined | null): string {
	if (typeof src === 'number') return src.toString();
	if (typeof src === 'string') return src.toLowerCase();
	return '';
}

/**
 *	Convert rawHeaders to object
 *	rawHeaders: https://nodejs.org/api/http2.html#requestrawheaders
 */
export function correctHeaders(src: HeadersValueLike[]): Record<string, (string | number)[]> {
	return src.reduce((dst, prop, i) => {
		if (i % 2 === 0) {
			if (typeof prop !== 'string') {
				throw new Error(`Invalid header key type '${typeof prop}' of ${prop}`);
			}
			if (prop.toLowerCase() in dst) return dst;
			dst[prop.toLowerCase()] = [];
		} else {
			dst[toStringOrToLc(src[i - 1])].push(prop == null ? '' : prop.toString());
		}
		return dst;
	}, {} as Record<string, (string | number)[]>);
}

/**
 * Convert number to Uint8Array, for ASN.1 length field
 */
export function numberToUint8Array(num: number | bigint): Uint8Array {
	const buf = new ArrayBuffer(8);
	const view = new DataView(buf);
	view.setBigUint64(0, BigInt(num), false);
	const viewUint8Array = new Uint8Array(buf);
	const firstNonZero = viewUint8Array.findIndex((v) => v !== 0);
	return viewUint8Array.slice(firstNonZero);
}

/**
 * Generate ASN.1 length field
 * @param length Length of the content
 * @returns ASN.1 length field
 */
export function genASN1Length(length: number | bigint): Uint8Array {
	if (length < 0x80n) {
		return new Uint8Array([Number(length)]);
	}
	const lengthUint8Array = numberToUint8Array(length);
	return new Uint8Array([0x80 + lengthUint8Array.length, ...lengthUint8Array]);
}

/**
 * ArrayBuffer to base64
 */
export function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
	const uint8Array = new Uint8Array(buffer);
	const binary = String.fromCharCode(...uint8Array);
	return btoa(binary);
}

/**
 * base64 to Uint8Array
 */
export function decodeBase64ToUint8Array(base64: string): Uint8Array {
	return Uint8Array.from(atob(base64), s => s.charCodeAt(0));
}

export class KeyValidationError extends Error {
	constructor(message: string) { super(message); }
}

export type SignInfoDefaults = {
	hash: SignatureHashAlgorithmUpperSnake,
	ec: 'DSA' | 'DH',
};

export const defaultSignInfoDefaults: SignInfoDefaults = {
	hash: 'SHA-256',
	ec: 'DSA',
};

export function genSignInfo(
	parsed: ParsedAlgorithmIdentifier,
	defaults: SignInfoDefaults = defaultSignInfoDefaults,
): SignInfo {
	const algorithm = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);
	if (!algorithm) throw new KeyValidationError('Unknown algorithm');
	if (algorithm === 'RSASSA-PKCS1-v1_5') {
		return {
			name: 'RSASSA-PKCS1-v1_5',
			hash: defaults.hash ?? 'SHA-256'
		};
	}
	if (algorithm === 'EC') {
		if (typeof parsed.parameter !== 'string') throw new KeyValidationError('Invalid EC parameter');
		return {
			name: `EC${defaults.ec}` as 'ECDSA' | 'ECDH',
			hash: defaults.hash ?? 'SHA-256',
			namedCurve: getNistCurveFromOid(parsed.parameter),
		};
	}
	if (algorithm === 'Ed25519') {
		return { name: 'Ed25519' };
	}
	if (algorithm === 'Ed448') {
		return { name: 'Ed448' };
	}
	throw new KeyValidationError('Unknown algorithm');
}

/**
 * Generate algorithm for sign and verify from key algorithm and defaults,
 * because algorithm of ECDSA and ECDH does not have hash property.
 */
export function genAlgorithmForSignAndVerify(keyAlgorithm: KeyAlgorithm, hashAlgorithm: SignatureHashAlgorithmUpperSnake) {
	return {
		hash: hashAlgorithm,
		...keyAlgorithm,
	};
}

export function splitPer64Chars(str: string): string[] {
	const result = [] as string[];
	for (let i = 0; i < str.length; i += 64) {
		result.push(str.slice(i, i + 64));
	}
	return result;
}

export function getMap<T extends MapLikeObj<K, V>, K, V>(
	obj: T,
): Map<K, V> {
	if (obj instanceof Map) return obj;
	if (Array.isArray(obj)) return new Map(obj);
	return new Map(Object.entries(obj) as [K, V][]);
}
