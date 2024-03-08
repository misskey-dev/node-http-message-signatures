import { DigestHashAlgorithm } from '../types';
import { getWebcrypto } from '../utils';

export type DigestSource = BufferSource | string;

export async function createBase64Digest(
	body: DigestSource,
	hash: DigestHashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
	if (hash === 'SHA') {
		hash = 'SHA-1';
	}
	if (typeof body === 'string') {
		body = (new TextEncoder()).encode(body);
	}
	return await (await getWebcrypto()).subtle.digest(hash, body);
}
