import ASN1 from '@lapo/asn1js';
import { ParsedAlgorithmIdentifierBase } from './spki';
export declare class Pkcs8ParseError extends Error {
    constructor(message: string);
}
export type ParsedPkcs8 = ParsedAlgorithmIdentifierBase & {
    /**
     * DER
     *
     * (Somehow crypto.createPublicKey will cause `error:1E08010C:DECODER routines::unsupported`)
     */
    der: ArrayBuffer;
    attributesRaw: ArrayBuffer | null;
};
/**
 * Parse PKCS#8 private key
 *
 * PrivateKeyInfo ::= SEQUENCE {
 *	version Version,
 *	privateKeyAlgorithm AlgorithmIdentifier {{PrivateKeyAlgorithms}},
 *	privateKey PrivateKey,
 *	attributes [0] Attributes OPTIONAL }
 *
 * PrivateKey ::= OCTET STRING
 * Version ::= INTEGER
 * Attributes ::= SET OF Attribute
 * @param input
 * @returns
 */
export declare function parsePkcs8(input: ASN1.StreamOrBinary): ParsedPkcs8;
