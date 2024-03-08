import { DigestSource } from './utils.js';
import { DigestHashAlgorithm, IncomingRequest } from '../types.js';
export declare function genRFC3230DigestHeader(body: DigestSource, hashAlgorithm: DigestHashAlgorithm): Promise<string>;
export declare const digestHeaderRegEx: RegExp;
export declare function verifyRFC3230DigestHeader(request: IncomingRequest, rawBody: DigestSource, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): Promise<boolean>;
