import { DigestHashAlgorithm } from '../types';
import { encodeArrayBufferToBase64, getWebcrypto } from '../utils';

export type DigestSource = BufferSource | string;

export async function createBase64Digest(body: DigestSource, hash: DigestHashAlgorithm): Promise<string>;
export async function createBase64Digest<Ks extends DigestHashAlgorithm[]>(body: DigestSource, hash: Ks): Promise<Map<Ks[number], string>>;
export async function createBase64Digest(body: DigestSource): Promise<string>
export async function createBase64Digest(
	body: DigestSource,
	hash: DigestHashAlgorithm | DigestHashAlgorithm[] = 'SHA-256',
): Promise<Map<DigestHashAlgorithm, string> | string> {
	if (Array.isArray(hash)) {
		return new Map(await Promise.all(hash.map((h) => {
			return (async () => [h, await createBase64Digest(body, h)] as const)();
		})));
	}

	if (hash === 'SHA') {
		hash = 'SHA-1';
	}
	if (typeof body === 'string') {
		body = (new TextEncoder()).encode(body);
	}
	const hashAb = await (await getWebcrypto()).subtle.digest(hash, body);
	return encodeArrayBufferToBase64(hashAb);
}
