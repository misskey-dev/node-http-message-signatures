import ASN1 from '@lapo/asn1js';
export declare class Pkcs8ParseError extends Error {
    constructor(message: string);
}
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
export declare function parsePkcs8(input: ASN1.StreamOrBinary): {
    attributesRaw: ArrayBuffer | null;
    algorithm: string;
    parameter: any;
    privateKey: ArrayBufferLike;
} | {
    attributesRaw: ArrayBuffer | null;
    algorithm: "1.2.840.113549.1.1.1\nrsaEncryption\nPKCS #1";
    parameter: null;
    privateKey: ArrayBufferLike;
} | {
    attributesRaw: ArrayBuffer | null;
    der: ArrayBuffer;
    algorithm: "1.3.101.112\ncurveEd25519\nEdDSA 25519 signature algorithm";
    parameter: null;
    privateKey: ArrayBufferLike;
} | {
    attributesRaw: ArrayBuffer | null;
    der: ArrayBuffer;
    algorithm: "1.2.840.10045.2.1\necPublicKey\nANSI X9.62 public key type";
    parameter: "1.2.840.10045.3.1.7\nprime256v1\nANSI X9.62 named elliptic curve";
    privateKey: ArrayBufferLike;
};
