/// <reference types="node" />
/// <reference types="node" />
import type { IncomingMessage } from "http";
import type { Http2ServerRequest } from "http2";
export type RequestLike = {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
};
export type IncomingRequest = RequestLike | IncomingMessage | Http2ServerRequest;
export type ClockSkewSettings = {
    /**
     * 基準とする時刻
     */
    now?: Date;
    /**
     * Toleration of time difference between the sender and me, when the sender's time is faster (gained) than mine
     * In milliseconds
     */
    forward?: number;
    /**
     * Toleration of time difference between the sender and me, when the sender's time is slower (losed) than mine.
     * In milliseconds
     */
    delay?: number;
};
export type SignInfoRSA = {
    keyAlg: 'rsa';
    hashAlg: NonNullable<SignatureHashAlgorithm>;
};
export type SignInfoEC = {
    keyAlg: 'ec';
    hashAlg: NonNullable<SignatureHashAlgorithm>;
};
export type SignInfoEd25519 = {
    keyAlg: 'ed25519';
    hashAlg: null;
};
export type SignInfoEd448 = {
    keyAlg: 'ed448';
    hashAlg: null;
};
export type SignInfo = SignInfoRSA | SignInfoEC | SignInfoEd25519 | SignInfoEd448;
export type PrivateKey = {
    privateKeyPem: string;
    keyId: string;
};
export type SignatureHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | null;
export type DigestHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
export type SignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';
export type ParsedDraftSignature = {
    version: 'draft';
    /**
     * Compatible with @peertube/http-signature
     * https://github.com/Chocobozzz/node-http-signature/blob/eaba61699775ad0d30be612d0661e0b240c46992/lib/parser.js#L73-L87
     */
    value: {
        scheme: 'Signature';
        params: {
            keyId: string;
            /**
             * lower-case
             * @example 'rsa-sha256'
             */
            algorithm?: string;
            /**
             * @example [ '(request-target)', 'date', 'host', 'digest' ]
             */
            headers: string[];
            signature: string;
        };
        signingString: string;
        /**
         * UPPER-CASE
         * @example 'RSA-SHA256'
         */
        algorithm?: string;
        keyId: string;
    };
};
export type ParsedSignature = ParsedDraftSignature;
