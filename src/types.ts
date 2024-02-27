export type RequestLike = {
	url: string;
	method: string;
	headers: Record<string, string>;
};

export type PrivateKey = {
	privateKeyPem: string;
	keyId: string;
};

export type SignatureHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | null;
// sign専用
export type SignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';
