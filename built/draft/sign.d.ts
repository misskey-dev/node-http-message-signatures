import { PrivateKey, RequestLike, SignatureAlgorithm, SignatureHashAlgorithm } from '@/types.js';
export declare function genDraftSigningString(request: RequestLike, includeHeaders: string[]): string;
export declare function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null): string;
export declare function genDraftAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm?: SignatureAlgorithm): string;
export declare function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
export declare function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts?: {
    hashAlgorithm?: SignatureHashAlgorithm;
}): {
    signingString: string;
    signature: string;
    signatureHeader: string;
};
