export type RequestLike = {
	url: string;
	method: string;
	headers: Record<string, string>;
};

export type SignInfoRSA = {
	keyAlg: 'rsa';
	hashAlg: NonNullable<SignatureHashAlgorithm>;
}
export type SignInfoEC = {
	keyAlg: 'ec';
	hashAlg: NonNullable<SignatureHashAlgorithm>;
}
export type SignInfoEd25519 = {
	keyAlg: 'ed25519';
	hashAlg: null;
}
export type SignInfoEd448 = {
	keyAlg: 'ed448';
	hashAlg: null;
}

export type SignInfo = SignInfoRSA | SignInfoEC | SignInfoEd25519 | SignInfoEd448;

export type PrivateKey = {
	privateKeyPem: string;
	keyId: string;
};

export type SignatureHashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | null;
// sign専用
export type SignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';
