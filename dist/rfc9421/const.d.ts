/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field name
 * value: item, list, dict
 */
export type SFVHeaderTypeDictionary = Record<string, 'item' | 'list' | 'dict'>;
/**
 * Dictionary of field name known to be structured field value
 * TODO: Find official registry
 */
export declare const knownSfvHeaderTypeDictionary: {
    /**
     * RFC 9421 HTTP Message Signatures
     * https://datatracker.ietf.org/doc/html/rfc9421#name-initial-contents-3
     */
    signature: "dict";
    'signature-input': "dict";
    'accept-signature': "dict";
    /**
     * RFC 9530 Digest Fields
     * https://datatracker.ietf.org/doc/html/rfc9530#name-http-field-name-registratio
     */
    'content-digest': "dict";
    'repr-digest': "dict";
    'want-content-digest': "dict";
    'want-repr-digest': "dict";
};
