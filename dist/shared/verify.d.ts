/**
 * Verify Request (Parsed)
 */
import type { ParsedSignature, SignInfo } from '../types.js';
import { ParsedAlgorithmIdentifier } from '../pem/spki.js';
export declare class KeyHashValidationError extends Error {
    constructor(message: string);
}
/**
 * 鍵のアルゴリズムと提供されたアルゴリズム(あれば)をもとに、キーとハッシュアルゴリズムをまとめる
 * 呼び出しの公開鍵の種類が提供されたものと一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム
 * @param publicKey 実際の公開鍵
 */
export declare function parseSignInfo(algorithm: string | undefined, real: ParsedAlgorithmIdentifier | CryptoKey['algorithm'], errorLogger?: ((message: any) => any)): SignInfo;
export declare function verifyParsedSignature(parsed: ParsedSignature, key: string | CryptoKey, errorLogger?: ((message: any) => any)): Promise<boolean>;
