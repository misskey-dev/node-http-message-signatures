import type { PrivateKey, RequestLike, SignatureHashAlgorithm } from '../types.js';
export declare function genDraftSigningString(request: RequestLike, includeHeaders: string[], additional?: {
    keyId: string;
    algorithm: string;
    created?: string;
    expires?: string;
    opaque?: string;
}): string;
export declare function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null): string;
export declare function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
export declare function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts?: {
    hashAlgorithm?: SignatureHashAlgorithm;
    web?: boolean;
}): {
    signingString: string;
    signature: string;
    signatureHeader: string;
};
export declare function signAsDraftToRequestWeb(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts?: {
    hashAlgorithm?: SignatureHashAlgorithm;
}): Promise<{
    signingString: string;
    signature: string;
    signatureHeader: string;
}>;
