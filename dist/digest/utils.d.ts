import { DigestHashAlgorithm } from '../types';
export type DigestSource = BufferSource | string;
export declare function createBase64Digest(body: DigestSource, hash: DigestHashAlgorithm): Promise<string>;
export declare function createBase64Digest<Ks extends DigestHashAlgorithm[]>(body: DigestSource, hash: Ks): Promise<Map<Ks[number], string>>;
export declare function createBase64Digest(body: DigestSource): Promise<string>;
