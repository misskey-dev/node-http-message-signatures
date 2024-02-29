/// <reference types="node" />
import * as crypto from 'node:crypto';
import type { SignatureHashAlgorithm } from '../types.js';
export declare class SignatureMissmatchWithProvidedAlgorithmError extends Error {
    constructor(providedAlgorithm: string, detectedAlgorithm: string, realKeyType: string);
}
/**
 * ヘッダーのアルゴリズムから鍵とハッシュアルゴリズムを認識する
 * 提供されたアルゴリズムと呼び出しの公開鍵の種類が一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム
 * @param key 実際の公開鍵
 */
export declare function detectAndVerifyAlgorithm(algorithm: string | undefined, publicKey: crypto.KeyObject): {
    keyAlg: crypto.KeyType;
    hashAlg: SignatureHashAlgorithm | null;
};
