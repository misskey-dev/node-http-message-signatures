import type { MapLikeObj, SignInfo, SignatureHashAlgorithmUpperSnake, HeadersLike, HeadersValueLike, HeadersValueLikeArrayable, IncomingRequest, OutgoingResponse } from './types.js';
import { ParsedAlgorithmIdentifier } from './pem/spki.js';
export declare function getWebcrypto(): Promise<Crypto>;
export declare const obsoleteLineFoldingRegEx: RegExp;
/**
 * RFC 9421 2.1 (3. Remove any obsolete line folding...) for HTTP/1.1
 */
export declare function removeObsoleteLineFolding(str: string): string;
/**
 * RFC 9421 2.1 (If the correctly combined value is not directly available for a given field by an implementation, ...)
 */
export declare function canonicalizeHeaderValue(value: HeadersValueLikeArrayable): string;
/**
 * Convert object keys to lowercase
 */
export declare function lcObjectKey<T extends Record<string, any>>(src: T): T;
/**
 * Get value from object, key is case-insensitive, with canonicalization
 */
export declare function getHeaderValue<T extends HeadersLike>(src: T, key: string): string | undefined;
/**
 * Get value from object, key is case-insensitive
 */
export declare function getValueByLc<T extends Record<string, any>>(src: T, key: string): T[keyof T] | undefined;
export declare function toStringOrToLc(src: string | number | undefined | null): string;
/**
 *	Convert rawHeaders to object
 *	rawHeaders: https://nodejs.org/api/http2.html#requestrawheaders
 */
export declare function correctHeadersFromFlatArray(src: HeadersValueLike[]): Record<string, (string | number)[]>;
/**
 * Collect request or response headers
 */
export declare function collectHeaders(source: IncomingRequest | OutgoingResponse): HeadersLike;
export declare function isBrowserResponse(input: any): input is Response;
export declare function isBrowserRequest(input: any): input is Request;
export declare function isBrowserHeader(input: any): input is Headers;
/**
 * Convert number to Uint8Array, for ASN.1 length field
 */
export declare function numberToUint8Array(num: number | bigint): Uint8Array;
/**
 * Generate ASN.1 length field
 * @param length Length of the content
 * @returns ASN.1 length field
 */
export declare function genASN1Length(length: number | bigint): Uint8Array;
/**
 * ArrayBuffer to base64
 */
export declare function encodeArrayBufferToBase64NonRFC4648(buffer: ArrayBuffer): string;
export declare function compareUint8Array(a: Uint8Array, b: Uint8Array): boolean;
export declare class KeyValidationError extends Error {
    constructor(message: string);
}
export type SignInfoDefaults = {
    hash: SignatureHashAlgorithmUpperSnake;
    ec: 'DSA' | 'DH';
};
export declare const defaultSignInfoDefaults: SignInfoDefaults;
export declare function genSignInfo(parsed: ParsedAlgorithmIdentifier, defaults?: SignInfoDefaults): SignInfo;
/**
 * Generate algorithm for sign and verify from key algorithm and defaults,
 * because algorithm of ECDSA and ECDH does not have hash property.
 */
export declare function genAlgorithmForSignAndVerify(keyAlgorithm: KeyAlgorithm, hashAlgorithm: SignatureHashAlgorithmUpperSnake): {
    name: string;
    hash: SignatureHashAlgorithmUpperSnake;
};
export declare function splitPer64Chars(str: string): string[];
export declare function getMap<T extends MapLikeObj<K, V>, K, V>(obj: T): Map<K, V>;
