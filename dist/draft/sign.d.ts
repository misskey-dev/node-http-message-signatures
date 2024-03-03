/// <reference types="node" />
import type { webcrypto as crypto } from 'node:crypto';
import type { PrivateKey, RequestLike, SignInfo, SignatureHashAlgorithmUpperSnake } from '../types.js';
export declare function getDraftAlgoString(algorithm: SignInfo): string;
export declare function genDraftSigningString(request: RequestLike, includeHeaders: string[], additional?: {
    keyId: string;
    algorithm: string;
    created?: string;
    expires?: string;
    opaque?: string;
}): string;
export declare function genDraftSignature(privateKey: crypto.CryptoKey, signingString: string): Promise<string>;
export declare function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
export declare function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts?: {
    hashAlgorithm?: SignatureHashAlgorithmUpperSnake;
}): Promise<{
    signingString: string;
    signature: string;
    signatureHeader: string;
}>;
