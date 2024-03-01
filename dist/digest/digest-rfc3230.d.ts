/// <reference types="node" />
import { DigestHashAlgorithm, IncomingRequest } from '../types';
import { BinaryLike } from 'node:crypto';
export declare function genRFC3230DigestHeader(body: string, hashAlgorithm?: DigestHashAlgorithm): string;
export declare const digestHeaderRegEx: RegExp;
export declare function verifyRFC3230DigestHeader(request: IncomingRequest, rawBody: BinaryLike, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): boolean;
