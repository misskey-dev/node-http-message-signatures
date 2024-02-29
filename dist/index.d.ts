export type * from './types.js';
export * from './parse.js';
export * from './utils.js';
export * from './keypair.js';
export * from './shared/verify.js';
import * as draftParse from './draft/parse.js';
export declare const HttpSignatureDraft: {
    verifySignature(parsed: {
        scheme: "Signature";
        params: {
            keyId: string;
            algorithm?: string | undefined;
            headers: string[];
            signature: string;
        };
        signingString: string;
        algorithm?: string | undefined;
        keyId: string;
    }, publicKeyPem: string, errorLogger?: ((message: any) => any) | undefined): boolean;
    genDraftSigningString(request: import("./types.js").RequestLike, includeHeaders: string[]): string;
    genDraftSignature(signingString: string, privateKey: string, hashAlgorithm: import("./types.js").SignatureHashAlgorithm): string;
    genDraftAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm?: import("./types.js").SignatureAlgorithm): string;
    genDraftSignatureHeader(includeHeaders: string[], keyId: string, signature: string, algorithm: string): string;
    signAsDraftToRequest(request: import("./types.js").RequestLike, key: import("./types.js").PrivateKey, includeHeaders: string[], opts?: {
        hashAlgorithm?: import("./types.js").SignatureHashAlgorithm | undefined;
    }): {
        signingString: string;
        signature: string;
        signatureHeader: string;
    };
    parseDraftRequestSignatureHeader(signatureHeader: string): Record<string, string>;
    parseDraftRequest(request: import("./types.js").IncomingRequest, options?: import("./parse.js").RequestParseOptions | undefined): import("./types.js").DraftParsedSignature;
    SignatureHeaderContentLackedError: typeof draftParse.SignatureHeaderContentLackedError;
};
/**
import * as rfc9421Parse from './rfc9421/parse.js';
import * as rfc9421Sign from './rfc9421/sign.js';
import * as rfc9421Verify from './rfc9421/verify.js';

export const RFC9421 = {
    ...rfc9421Parse,
    ...rfc9421Sign,
    ...rfc9421Verify,
};
*/
