/// <reference types="node" />
import { webcrypto as crypto } from 'node:crypto';
import { DigestHashAlgorithm } from '../types';
export type DigestSource = crypto.BufferSource | string;
export declare function createBase64Digest(body: DigestSource, hash: DigestHashAlgorithm): Promise<string>;
export declare function createBase64Digest<Ks extends DigestHashAlgorithm[]>(body: DigestSource, hash: Ks): Promise<Map<Ks[number], string>>;
export declare function createBase64Digest(body: DigestSource): Promise<string>;
