type RequestLike = {
    url: string;
    method: string;
    headers: Record<string, string>;
};
type SignInfoRSA = {
    keyAlg: 'rsa';
    hashAlg: NonNullable<SignatureHashAlgorithm>;
};
type SignInfoEC = {
    keyAlg: 'ec';
    hashAlg: NonNullable<SignatureHashAlgorithm>;
};
type SignInfoEd25519 = {
    keyAlg: 'ed25519';
    hashAlg: null;
};
type SignInfoEd448 = {
    keyAlg: 'ed448';
    hashAlg: null;
};
type SignInfo = SignInfoRSA | SignInfoEC | SignInfoEd25519 | SignInfoEd448;
type PrivateKey = {
    privateKeyPem: string;
    keyId: string;
};
type SignatureHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | null;
type SignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';

declare function genDraftSigningString(request: RequestLike, includeHeaders: string[]): string;
declare function genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm | null): string;
declare function genDraftAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm?: SignatureAlgorithm): string;
declare function genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
declare function signAsDraftToRequest(request: RequestLike, key: PrivateKey, includeHeaders: string[], opts?: {
    hashAlgorithm?: SignatureHashAlgorithm;
}): {
    signingString: string;
    signature: string;
    signatureHeader: string;
};

type ParsedSignature = {
    scheme: 'Signature';
    params: {
        keyId: string;
        algorithm?: string;
        headers: string[];
        signature: string;
    };
    signingString: string;
    algorithm?: string;
    keyId: string;
};
declare function verifySignature(parsed: ParsedSignature, publicKeyPem: string): boolean;

export { type PrivateKey, type RequestLike, type SignInfo, type SignInfoEC, type SignInfoEd25519, type SignInfoEd448, type SignInfoRSA, type SignatureAlgorithm, type SignatureHashAlgorithm, genDraftAuthorizationHeader, genDraftSignature, genDraftSignatureHeader, genDraftSigningString, signAsDraftToRequest, verifySignature };
