import { DigestSource } from './utils.js';
import { DigestHashAlgorithm, IncomingRequest } from '../types.js';
export declare function genRFC3230DigestHeader(body: DigestSource, hashAlgorithm: DigestHashAlgorithm): Promise<string>;
export declare const digestHeaderRegEx: RegExp;
/**
 * @param request Incoming request
 * @param rawBody Raw body
 * @param failOnNoDigest If false, return true when no Digest header is found (default: true)
 * @param errorLogger When returing false, called with the error message
 * @returns Promise<boolean>
 */
export declare function verifyRFC3230DigestHeader(request: IncomingRequest, rawBody: DigestSource, opts?: boolean | {
    /**
     * If false, return true when no Digest header is found
     * @default true
     */
    failOnNoDigest?: boolean;
    /**
     * Specify hash algorithms you accept (Web Crypto API algorithm names)
     */
    algorithms: DigestHashAlgorithm[];
}, errorLogger?: ((message: any) => any)): Promise<boolean>;
