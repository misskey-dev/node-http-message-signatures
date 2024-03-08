import { DigestSource } from './utils.js';
import type { DigestHashAlgorithm, IncomingRequest } from '../types.js';
import * as sh from 'structured-headers';
export declare class RFC9530GenerateDigestHeaderError extends Error {
    constructor(message: string);
}
export type RFC9530HashAlgorithmStatus = 'Active' | 'Provisional' | 'Deprecated';
export declare const RFC9530HashAlgorithmRegistry: {
    'sha-512': "Active";
    'sha-256': "Active";
    md5: "Deprecated";
    sha: "Deprecated";
    unixsum: "Deprecated";
    unixcksum: "Deprecated";
    adler: "Deprecated";
    crc32c: "Deprecated";
};
export type RFC9530HashAlgorithm = keyof typeof RFC9530HashAlgorithmRegistry;
export declare const supportedHashAlgorithmsWithRFC9530AndWebCrypto: ("sha-512" | "sha-256")[];
/**
 * Want-*-Digest parsed by structured-headers.parseDictionary
 * https://datatracker.ietf.org/doc/html/rfc9530#name-integrity-preference-fields
 */
export type RFC9530Prefernece = Map<string, [number, Map<any, any>]>;
export declare function convertHashAlgorithmFromWebCryptoToRFC9530(algo: DigestHashAlgorithm): RFC9530HashAlgorithm;
/**
 * @param prefernece Prefernece map (Want-*-Digest field parsed by structured-headers.parseDictionary)
 * @param meAcceptable The hash algorithms that You can accept or use
 * @returns
 */
export declare function chooseRFC9530HashAlgorithmByPreference(prefernece: RFC9530Prefernece, meAcceptable?: RFC9530HashAlgorithm[]): RFC9530HashAlgorithm | null;
export type RFC9530DigestHeaderObject = [string, [sh.ByteSequence, Map<any, any>]][];
/**
 * Generate single Digest header
 * @param body The body to be hashed
 * @param hashAlgorithm
 *	Supported common to RFC 9530 Registered and SubtleCrypto.digest = Only 'SHA-256' and 'SHA-512'
 * @returns `[[algorithm, [ByteSequence, Map(0)]]]`
 *	To convert to string, use serializeDictionary from structured-headers
 */
export declare function genSingleRFC9530DigestHeader(body: DigestSource, hashAlgorithm: string): Promise<RFC9530DigestHeaderObject>;
/**
 * Generate Digest header
 * @param body The body to be hashed
 * @param hashAlgorithms
 *	Supported common to RFC 9530 Registered and SubtleCrypto.digest = Only 'SHA-256' and 'SHA-512'
 * @param process
 *	'concurrent' to use Promise.all, 'sequential' to use for..of
 *	@default 'concurrent'
 * @returns `[algorithm, [ByteSequence, Map(0)]][]`
 *	To convert to string, use serializeDictionary from structured-headers
 */
export declare function genRFC9530DigestHeader(body: DigestSource, hashAlgorithms?: string | RFC9530Prefernece | Iterable<string>, process?: 'concurrent' | 'sequential'): Promise<RFC9530DigestHeaderObject>;
/**
 * Verify Content-Digest header (not Repr-Digest)
 * @param request IncomingRequest
 * @param rawBody Raw body
 * @param opts Options
 * @param errorLogger Error logger when verification fails
 * @returns Whether digest is valid with the body
 */
export declare function verifyRFC9530DigestHeader(request: IncomingRequest, rawBody: DigestSource, opts?: {
    /**
     * If false, return true when no Digest header is found
     * @default true
     */
    failOnNoDigest?: boolean;
    /**
     * If true, verify all digests without not supported algorithms
     * If false, use the first supported and exisiting algorithm in hashAlgorithms
     * @default true
     */
    verifyAll?: boolean;
    /**
     * Specify hash algorithms you accept. (RFC 9530 algorithm registries)
     *
     * If `varifyAll: false`, it is also used to choose the hash algorithm to verify.
     * (Younger index is preferred.)
     */
    hashAlgorithms?: RFC9530HashAlgorithm[];
}, errorLogger?: ((message: any) => any)): Promise<boolean>;
