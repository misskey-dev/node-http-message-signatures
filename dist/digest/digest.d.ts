import { DigestHashAlgorithm, IncomingRequest } from "../types.js";
import { DigestSource } from "./utils.js";
export declare function verifyDigestHeader(request: IncomingRequest, rawBody: DigestSource, opts?: boolean | {
    /**
     * If false, return true when no Digest header is found
     * @default true
     */
    failOnNoDigest?: boolean;
    /**
     * Specify hash algorithms you accept (Web Crypto API algorithm names)
     */
    algorithms: DigestHashAlgorithm[];
    /**
     * RFC 9530 (Content-Digest) only
     * If true, verify all digests without not supported algorithms
     * If false, use the first supported and exisiting algorithm in hashAlgorithms
     * @default true
     */
    verifyAll?: boolean;
}, errorLogger?: ((message: any) => any)): Promise<boolean>;
