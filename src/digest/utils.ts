import { textEncoder } from '../const.js';
import { DigestHashAlgorithm } from '../types.js';
import { getWebcrypto } from '../utils.js';

export type DigestSource = BufferSource | string;

export async function createBase64Digest(
	body: DigestSource,
	hash: DigestHashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
	if (hash === 'SHA') {
		hash = 'SHA-1';
	}
	if (typeof body === 'string') {
		body = textEncoder.encode(body);
	}
	return await (await getWebcrypto()).subtle.digest(hash, body);
}
