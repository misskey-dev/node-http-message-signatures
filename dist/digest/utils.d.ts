import { DigestHashAlgorithm } from '../types.js';
export type DigestSource = BufferSource | string;
export declare function createBase64Digest(body: DigestSource, hash?: DigestHashAlgorithm): Promise<ArrayBuffer>;
