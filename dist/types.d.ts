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
    name: 'RSASSA-PKCS1-v1_5';
    hash: NonNullable<SignatureHashAlgorithmUpperSnake>;
};
export type SignInfoEC = {
    name: 'ECDSA' | 'ECDH';
    hash: NonNullable<SignatureHashAlgorithmUpperSnake>;
    namedCurve: ECNamedCurve;
};
export type SignInfoEd25519 = {
    name: 'Ed25519';
};
export type SignInfoEd448 = {
    name: 'Ed448';
    context?: string;
};
export type SignInfo = SignInfoRSA | SignInfoEC | SignInfoEd25519 | SignInfoEd448;
export type PrivateKey = {
    privateKeyPem: string;
    keyId: string;
};
export type KeyAlgorithmName = 'RSASSA-PKCS1-v1_5' | 'DSA' | 'DH' | 'KEA' | 'EC' | 'Ed25519' | 'Ed448';
export type ECNamedCurve = 'P-192' | 'P-224' | 'P-256' | 'P-384' | 'P-521';
export type SignatureHashAlgorithmUpperSnake = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | null;
export type DigestHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
export type DraftSignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';
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
