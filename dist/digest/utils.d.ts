/// <reference types="node" />
import { BinaryLike } from 'node:crypto';
import { DigestHashAlgorithm } from '../types';
export declare function createBase64Digest(body: BinaryLike, hash: DigestHashAlgorithm): string;
export declare function createBase64Digest<Ks extends DigestHashAlgorithm[]>(body: BinaryLike, hash: Ks): Map<Ks[number], string>;
export declare function createBase64Digest(body: BinaryLike): string;
