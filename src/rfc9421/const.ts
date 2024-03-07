/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field name
 * value: item, list, dict
 */
export type SFVHeaderTypeDictionary = Record<string, 'item' | 'list' | 'dict'>

/**
 * Dictionary of field name known to be structured field value
 * TODO: Find official registry
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
} satisfies SFVHeaderTypeDictionary;
