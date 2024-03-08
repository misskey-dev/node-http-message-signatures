import { DigestHashAlgorithm } from '../types';
export type DigestSource = BufferSource | string;
export declare function createBase64Digest(body: DigestSource, hash?: DigestHashAlgorithm): Promise<ArrayBuffer>;
