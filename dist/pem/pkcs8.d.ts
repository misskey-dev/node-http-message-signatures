/// <reference types="node" />
import ASN1 from '@lapo/asn1js';
import { ParsedAlgorithmIdentifierBase } from './spki.js';
import { genSignInfo } from '../utils.js';
import type { webcrypto } from 'node:crypto';
export declare class Pkcs8ParseError extends Error {
    constructor(message: string);
}
export type ParsedPkcs8 = ParsedAlgorithmIdentifierBase & {
    /**
     * DER
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
/**
 * Parse private key and run `crypto.subtle.importKey`
 * (only supports PKCS#8)
 * @param key string or ArrayBuffer
 * @param keyUsages e.g. ['verify']
 * @param defaults
 * @returns CryptoKey
 */
export declare function importPrivateKey(key: ASN1.StreamOrBinary, keyUsages: webcrypto.KeyUsage[], defaults?: Parameters<typeof genSignInfo>[1]): Promise<webcrypto.CryptoKey>;
