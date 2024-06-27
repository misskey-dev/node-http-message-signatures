import type { MapLikeObj, SignInfo, SignatureHashAlgorithmUpperSnake, HeadersLike, HeadersValueLike, HeadersValueLikeArrayable, IncomingRequest, OutgoingResponse } from './types.js';
import { ParsedAlgorithmIdentifier, getNistCurveFromOid, getPublicKeyAlgorithmNameFromOid } from './pem/spki.js';
import { base64 } from 'rfc4648';

export async function getWebcrypto() {
	return globalThis.crypto ?? (await import('node:crypto')).webcrypto;
}

//#region req/res header
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

export function toStringOrToLc(src: string | number | undefined | null): string {
	if (typeof src === 'number') return src.toString();
	if (typeof src === 'string') return src.toLowerCase();
	return '';
}

/**
 *	Convert rawHeaders to object
 *	rawHeaders: https://nodejs.org/api/http2.html#requestrawheaders
 */
export function correctHeadersFromFlatArray(src: HeadersValueLike[]): Record<string, (string | number)[]> {
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
 * Collect request or response headers
 */
export function collectHeaders(source: IncomingRequest | OutgoingResponse): HeadersLike {
	if ('rawHeaders' in source && source.rawHeaders) {
		return correctHeadersFromFlatArray(source.rawHeaders.flat(1));
	} else if ('getHeaders' in source && typeof source.getHeaders === 'function') {
		return lcObjectKey(source.getHeaders());
	} else if ('headers' in source && source.headers) {
		if (typeof source.headers !== 'object') {
			throw new Error('headers must be an object');
		}
		if (isBrowserHeader(source.headers)) {
			// Browser Headers
			return correctHeadersFromFlatArray(Array.from(source.headers.entries()).flat(1));
		} else if (Array.isArray(source.headers)) {
			// 一応対応
			return correctHeadersFromFlatArray(source.headers.flat(1));
		} else {
			return lcObjectKey(source.headers as Record<string, string | string[]>);
		}
	}
	throw new Error('Cannot get headers from request object');
}

export function setHeaderToRequestOrResponse(reqres: IncomingRequest | OutgoingResponse, key: string, value: string | number) {
	if ('setHeader' in reqres && typeof reqres.setHeader === 'function') {
		reqres.setHeader(key, value.toString());
	} else if ('headers' in reqres && typeof reqres.headers === 'object') {
		if (isBrowserHeader(reqres.headers)) {
			// Browser Headers
			reqres.headers.set(key, value.toString());
		} else {
			reqres.headers[key] = value.toString();
		}
	} else {
		throw new Error('Cannot set headers to request object');
	}
}

export function isBrowserResponse(input: any): input is Response {
	return 'Response' in globalThis && typeof input === 'object' && input instanceof Response;
}
export function isBrowserRequest(input: any): input is Request {
	return 'Request' in globalThis && typeof input === 'object' && input instanceof Request;
}
export function isBrowserHeader(input: any): input is Headers {
	return 'Headers' in globalThis && typeof input === 'object' && input instanceof Headers;
}
//#endregion

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
	return base64.stringify(uint8Array);
}

// If equal, return true
export function compareUint8Array(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
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
	if (obj instanceof Map) return new Map(obj);
	if (Array.isArray(obj)) return new Map(obj);
	return new Map(Object.entries(obj) as [K, V][]);
}

export function getMapWithoutUndefined<T extends MapLikeObj<K, V>, K, V>(
	obj: T,
): Map<K, NonNullable<V>> {
	const map = getMap<T, K, V>(obj);
	for (const [k, v] of map.entries()) {
		if (v === undefined) {
			map.delete(k);
		}
	}
	return map as any;
}
