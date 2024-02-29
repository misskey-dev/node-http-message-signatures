import { createHash, BinaryLike } from 'node:crypto';
import { DigestHashAlgorithm } from '../types';

export function createBase64Digest(body: BinaryLike, hash: DigestHashAlgorithm): string;
export function createBase64Digest<Ks extends DigestHashAlgorithm[]>(body: BinaryLike, hash: Ks): Map<Ks[number], string>;
export function createBase64Digest(body: BinaryLike): string
export function createBase64Digest(
	body: BinaryLike,
	hash: DigestHashAlgorithm | DigestHashAlgorithm[] = 'sha256',
): Map<DigestHashAlgorithm, string> | string {
	if (Array.isArray(hash)) {
		return new Map(hash.map((h) => [h, createBase64Digest(body, h)]));
	}
	return createHash(hash).update(body).digest('base64');
}
