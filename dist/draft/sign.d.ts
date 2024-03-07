import type { IncomingRequest, PrivateKey, SignatureHashAlgorithmUpperSnake } from '../types.js';
import { type SignInfoDefaults } from '../utils.js';
/**
 * Get the algorithm string for draft encoding
 * @param keyAlgorithm Comes from `privateKey.algorithm.name` e.g. 'RSASSA-PKCS1-v1_5'
 * @param hashAlgorithm e.g. 'SHA-256'
 * @returns string e.g. 'rsa-sha256'
 */
export declare function getDraftAlgoString(keyAlgorithm: string, hashAlgorithm: SignatureHashAlgorithmUpperSnake): string;
export declare function genDraftSigningString(source: IncomingRequest, includeHeaders: string[], additional?: {
    keyId: string;
    algorithm: string;
    created?: string;
    expires?: string;
    opaque?: string;
}): string;
export declare function genDraftSignature(privateKey: CryptoKey, signingString: string, defaults?: SignInfoDefaults): Promise<string>;
export declare function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
/**
 *
 * @param request Request object to sign
 * @param key Private key to sign
 * @param includeHeaders Headers to build the sigining string
 * @param opts
 * @returns result object
 */
export declare function signAsDraftToRequest(request: IncomingRequest, key: PrivateKey, includeHeaders: string[], opts?: SignInfoDefaults): Promise<{
    signingString: string;
    signature: string;
    signatureHeader: string;
}>;
