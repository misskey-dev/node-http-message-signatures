/// <reference types="node" />
import * as crypto from 'node:crypto';
import type { SignatureHashAlgorithm } from '../types.js';
/**
 * ヘッダーのアルゴリズムから鍵とハッシュアルゴリズムを認識する
 * 提供されたアルゴリズムと呼び出しの公開鍵の種類が一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム
 * @param publicKey 実際の公開鍵
 */
export declare function detectAndVerifyAlgorithm(algorithm: string | undefined, publicKey: crypto.KeyObject, errorLogger?: ((message: any) => any)): {
    keyAlg: crypto.KeyType;
    hashAlg: SignatureHashAlgorithm | null;
} | null;
