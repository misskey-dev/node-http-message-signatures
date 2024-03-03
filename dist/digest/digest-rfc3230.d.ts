/// <reference types="node" />
import { DigestHashAlgorithm, IncomingRequest } from '../types';
import { BinaryLike } from 'node:crypto';
export declare const digestHashAlgosForDecoding: {
    readonly SHA: "sha1";
    readonly 'SHA-1': "sha1";
    readonly 'SHA-256': "sha256";
    readonly 'SHA-384': "sha384";
    readonly 'SHA-512': "sha512";
    readonly MD5: "md5";
};
export declare function genRFC3230DigestHeader(body: string, hashAlgorithm?: DigestHashAlgorithm): string;
export declare const digestHeaderRegEx: RegExp;
export declare function verifyRFC3230DigestHeader(request: IncomingRequest, rawBody: BinaryLike, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): boolean;
