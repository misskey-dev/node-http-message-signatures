/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field name
 * value: 'item' | 'list' | 'dict' | 'item' | 'bs' | 'int' | 'dec' | 'str' | 'bool' | 'token'
 */
export type SFVHeaderTypeDictionary = Record<string, 'item' | 'list' | 'dict' | 'item' | 'bs' | 'int' | 'dec' | 'str' | 'bool' | 'token'>

/**
 * Dictionary of field name known to be structured field value
 * https://datatracker.ietf.org/doc/rfc8941/referencedby/
 */
export const knownSfvHeaderTypeDictionary = {
	/**
	 * RFC 9421 HTTP Message Signatures
	 * https://datatracker.ietf.org/doc/html/rfc9421#name-initial-contents-3
	 */
	// https://datatracker.ietf.org/doc/html/rfc9421#signature-header
	'signature': 'dict',
	// https://datatracker.ietf.org/doc/html/rfc9421#signature-input-header
	'signature-input': 'dict',
	// https://datatracker.ietf.org/doc/html/rfc9421#accept-signature-header
	'accept-signature': 'dict',

	/**
	 * RFC 9530 Digest Fields
	 * https://datatracker.ietf.org/doc/html/rfc9530#name-http-field-name-registratio
	 */
	// https://datatracker.ietf.org/doc/html/rfc9530#name-the-content-digest-field
	'content-digest': 'dict',
	// https://datatracker.ietf.org/doc/html/rfc9530#name-the-repr-digest-field
	'repr-digest': 'dict',
	// https://datatracker.ietf.org/doc/html/rfc9530#name-integrity-preference-fields
	'want-content-digest': 'dict',
	// https://datatracker.ietf.org/doc/html/rfc9530#want-fields
	'want-repr-digest': 'dict',

	// https://datatracker.ietf.org/doc/html/rfc8942#name-the-accept-ch-response-head
	'accept-ch': 'list',

	// https://datatracker.ietf.org/doc/html/rfc9209#name-the-proxy-status-http-field
	'proxy-status': 'list',

	// https://datatracker.ietf.org/doc/html/rfc9211#name-the-cache-status-http-respo
	'cache-status': 'list',

	// https://datatracker.ietf.org/doc/html/rfc9218#name-priority-parameters
	'priority': 'dict',

	// https://datatracker.ietf.org/doc/html/rfc9440#name-client-cert-http-header-fie
	'client-cert': 'bs',
	// https://datatracker.ietf.org/doc/html/rfc9440#name-client-cert-chain-http-head
	'client-cert-chain': 'list',
} satisfies SFVHeaderTypeDictionary;
