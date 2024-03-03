import type { SignInfo, SignatureHashAlgorithm } from './types.js';
/**
 * privateKeyPemからhashAlgorithmを推測する
 *   hashが指定されていない場合、RSAかECの場合はsha256を補完する
 *   ed25519, ed448の場合はhashAlgorithmは常にnull
 */
export declare function prepareSignInfo(privateKeyPem: string, hash?: SignatureHashAlgorithm): SignInfo;
export declare function getDraftAlgoString(signInfo: SignInfo): string;
export declare function webGetDraftAlgoString(parsed: any): any;
/**
 * Convert object keys to lowercase
 */
export declare function lcObjectKey<T extends Record<string, any>>(src: T): T;
/**
 * Get value from object, key is case-insensitive
 */
export declare function lcObjectGet<T extends Record<string, any>>(src: T, key: string): T[keyof T] | undefined;
/**
 *  Get the Set of keys of the object, lowercased
 */
export declare function objectLcKeys<T extends Record<string, any>>(src: T): Set<string>;
/**
 * convert number to Uint8Array, for ASN.1 length field
 */
export declare function numberToUint8Array(num: number | bigint): Uint8Array;
export declare function genASN1Length(length: number | bigint): Uint8Array;
/**
 * For web
 */
export declare function encodeArrayBufferToBase64(buffer: ArrayBuffer): string;
