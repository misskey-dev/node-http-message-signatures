import { createHash, BinaryLike } from 'node:crypto';
import { DigestHashAlgorithm } from './types';

export function createDigest(body: BinaryLike, hash: DigestHashAlgorithm): string;
export function createDigest<Ks extends DigestHashAlgorithm[]>(body: BinaryLike, hash: Ks): Map<Ks[number], string>;
export function createDigest(body: BinaryLike): string
export function createDigest(
	body: BinaryLike,
	hash: DigestHashAlgorithm | DigestHashAlgorithm[] = 'sha256',
): Map<DigestHashAlgorithm, string> | string {
	if (Array.isArray(hash)) {
		return new Map(hash.map((h) => [h, createHash(h).update(body).digest('base64')]));
	}
	return createHash(hash).update(body).digest('base64');
}
