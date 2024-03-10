/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field name
 * value: 'list' | 'dict' | 'item' | 'bs' | 'int' | 'dec' | 'str' | 'bool' | 'token'
 */
export type SFVHeaderTypeDictionary = Record<string, 'list' | 'dict' | 'item' | 'bs' | 'int' | 'dec' | 'str' | 'bool' | 'token'>;
/**
 * Dictionary of field name known to be structured field value
 * https://datatracker.ietf.org/doc/rfc8941/referencedby/
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
    'accept-ch': "list";
    'proxy-status': "list";
    'cache-status': "list";
    priority: "dict";
    'client-cert': "bs";
    'client-cert-chain': "list";
};
