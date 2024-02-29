import type { SignInfo, SignatureHashAlgorithm } from './types.js';
/**
 * privateKeyPemからhashAlgorithmを推測する
 *   hashが指定されていない場合、RSAかECの場合はsha256を補完する
 *   ed25519, ed448の場合はhashAlgorithmは常にnull
 */
export declare function prepareSignInfo(privateKeyPem: string, hash?: SignatureHashAlgorithm): SignInfo;
export declare function getDraftAlgoString(signInfo: SignInfo): string;
/**
 * Convert object keys to lowercase
 */
export declare function lcObjectKey<T extends Record<string, string>>(src: T): T;
