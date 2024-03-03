import ASN1 from '@lapo/asn1js';
export declare class Pkcs1ParseError extends Error {
    constructor(message: string);
}
export declare function parsePkcs1(input: ASN1.StreamOrBinary): {
    pkcs1: ArrayBufferLike;
    modulus: number;
    publicExponent: number;
};
export declare const rsaASN1AlgorithmIdentifier: Uint8Array;
/**
 * Generate SPKI public key from PKCS#1 public key
 * as RSASSA-PKCS1-v1_5
 * @param input PKCS#1 public key
 * @returns SPKI public key DER
 */
export declare function genSpkiFromPkcs1(input: ASN1.StreamOrBinary): Uint8Array;
