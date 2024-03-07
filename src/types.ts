import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import type { webcrypto } from "node:crypto";

export type HeadersValueLike = string | number | undefined | (string | number | undefined)[];
export type HeadersLike = Record<string, HeadersValueLike>;

export type RequestLike = {
	url: string;
	method: string;
	headers: HeadersLike
	// https://nodejs.org/api/http2.html#requestrawheaders
	rawHeaders?: (string | number | undefined)[];
	getHeaders?: () => HeadersLike;
	body?: string;
	trailers?: Record<string, string>;
	headersDistinct?: Record<string, string[]>;
	httpVersionMajor?: number;
};

export type ResponseLike = {
	/**
	 * If 'req' is set, the object treated as a response
	 */
	req: RequestLike;
	statusCode: number;
	headers: HeadersLike;
	// https://nodejs.org/api/http2.html#requestrawheaders
	rawHeaders?: (string | number | undefined)[];
	getHeaders?: () => HeadersLike;
	body?: string;
	trailers?: Record<string, string>;
}

export type IncomingRequest = RequestLike | IncomingMessage | Http2ServerRequest;
export type OutgoingResponse = ResponseLike | ServerResponse | Http2ServerResponse;

export type ClockSkewSettings = {
	/**
	 * 基準とする時刻
	 */
	now?: Date;

	/**
	 * Toleration of time difference between the sender and me, when the sender's time is faster (gained) than mine
	 * In milliseconds
	 */
	forward?: number;

	/**
	 * Toleration of time difference between the sender and me, when the sender's time is slower (losed) than mine.
	 * In milliseconds
	 */
	delay?: number;
}

export type SignInfoRSAPSS = {
	name: 'RSA-PSS';
	hash: NonNullable<SignatureHashAlgorithmUpperSnake>;
	saltLength?: number;
}
export type SignInfoRSA = {
	name: 'RSASSA-PKCS1-v1_5';
	hash: NonNullable<SignatureHashAlgorithmUpperSnake>;
}
export type SignInfoEC = {
	name: 'ECDSA' | 'ECDH';
	hash: NonNullable<SignatureHashAlgorithmUpperSnake>;
	namedCurve: ECNamedCurve;
};
export type SignInfoEd25519 = {
	name: 'Ed25519';
}
export type SignInfoEd448 = {
	name: 'Ed448';
	context?: string;
}

export type SignInfo = SignInfoRSAPSS | SignInfoRSA | SignInfoEC | SignInfoEd25519 | SignInfoEd448;

export type PrivateKeyWithPem = {
	privateKeyPem: string;
	keyId: string;
};
export type PrivateKeyWithCryptoKey = {
	privateKey: webcrypto.CryptoKey;
	keyId: string;
};
export type PrivateKey = PrivateKeyWithPem | PrivateKeyWithCryptoKey;

// Compatible with CryptoKey.algorithm.name
export type KeyAlgorithmName = 'RSA-PSS' | 'RSASSA-PKCS1-v1_5' | 'DSA' | 'DH' | 'KEA' | 'EC' | 'Ed25519' | 'Ed448';
export type ECNamedCurve = 'P-192' | 'P-224' | 'P-256' | 'P-384' | 'P-521';
export type SignatureHashAlgorithmUpperSnake = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | null;
export type DigestHashAlgorithm = 'SHA' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
// sign専用
export type DraftSignatureAlgorithm = 'rsa-sha1' | 'rsa-sha256' | 'rsa-sha384' | 'rsa-sha512' | 'ecdsa-sha1' | 'ecdsa-sha256' | 'ecdsa-sha384' | 'ecdsa-sha512' | 'ed25519-sha512' | 'ed25519' | 'ed448';
export type RFC9421SignatuerAlgorithm = 'rsa-pss-sha512' | 'rsa-v1_5-sha256' | 'hmac-sha256' | 'ecdsa-p256-sha256' | 'ecdsa-p384-sha384' | 'ed25519';

export type ParsedDraftSignature = {
	version: 'draft';

	/**
	 * Compatible with @peertube/http-signature
	 * https://github.com/Chocobozzz/node-http-signature/blob/eaba61699775ad0d30be612d0661e0b240c46992/lib/parser.js#L73-L87
	 */
	value: {
		scheme: 'Signature';
		params: {
			keyId: string;

			/**
			 * lower-case
			 * @example 'rsa-sha256'
			 */
			algorithm?: string;

			/**
			 * @example [ '(request-target)', 'date', 'host', 'digest' ]
			 */
			headers: string[];
			signature: string;
		};
		signingString: string;

		/**
		 * UPPER-CASE
		 * @example 'RSA-SHA256'
		 */
		algorithm?: string;
		keyId: string;
	};
};

export type MapLikeObj<K, V> = Map<K, V> | Record<string, V> | [K, V][];

export type SFVParametersLike = MapLikeObj<string, string | boolean | number>;

/**
 * sh.InnerList
 * @examples [["@method", Map([])], Map({keyid: "x", algo: ""})]
 */
export type SFVSignatureParams = [[string, Map<string, string | boolean>][], Map<string, string | boolean | number>];
export type SFVSignatureParamsForInput = [[string, MapLikeObj<string, string | boolean>][], MapLikeObj<string, string | boolean | number>];

/**
 * Result of `sh.parseDictionary('(value of signateure-input)')`
 */
export type SFVSignatureInputDictionary = Map<string, SFVSignatureParams>;
export type SFVSignatureInputDictionaryForInput = MapLikeObj<string, SFVSignatureParamsForInput>;

export type ParsedRFC9421SignatureValue = {
	label: string,
	keyid: string;

	/**
	 * alg
	 * @example 'rsa-v1_5-sha256'
	 */
	algorithm: string;

	/**
	 * @example ['@method', '@path', '@authority', 'date', 'content-digest', '@signature-params']
	 */
	components: string[];

	created?: number;
	expires?: number;
}

export type ParsedRFC9421SignatureValueWithBase = ParsedRFC9421SignatureValue & {
	/**
	 * @example
	 * ```
	 * "@method": POST
	 * "@path": /foo
	 * "@authority": example.com
	 * "date": Tue, 20 Apr 2021 02:07:55 GMT
	 * ```
	 */
	base: string;
};

export type ParsedRFC9421Signature = {
	version: 'rfc9421';

	value: ParsedRFC9421SignatureValueWithBase[];
}

export type ParsedSignature = ParsedDraftSignature | ParsedRFC9421Signature;
