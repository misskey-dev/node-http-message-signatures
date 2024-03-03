/**
 * Verify Request (Parsed)
 */
import type { ParsedDraftSignature, SignInfo } from '../types.js';
import { ParsedAlgorithmIdentifier } from '../pem/spki.js';
export declare class DraftKeyHashValidationError extends Error {
    constructor(message: string);
}
/**
 * 鍵のアルゴリズムとDraft仕様のalgorithmをもとに、キーとハッシュアルゴリズムをまとめる
 * 呼び出しの公開鍵の種類が提供されたものと一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム（Draft仕様）
 * @param publicKey 実際の公開鍵
 */
export declare function genSignInfoDraft(algorithm: string | undefined, parsed: ParsedAlgorithmIdentifier, errorLogger?: ((message: any) => any)): SignInfo;
/**
 * Verify a draft signature
 */
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): Promise<boolean>;
