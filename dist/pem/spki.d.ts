/// <reference types="node" />
import ASN1 from '@lapo/asn1js';
import { ECNamedCurve, KeyAlgorithmName } from '../types';
import type { webcrypto } from 'node:crypto';
import { genSignInfo } from '../utils';
export declare class SpkiParseError extends Error {
    constructor(message: string);
}
/**
 * Get algorithm name from OID
 * https://datatracker.ietf.org/doc/html/rfc3279#section-2.3
 * https://datatracker.ietf.org/doc/html/rfc8420#appendix-A
 * @param oidStr e.g. '1.2.840.113549.1.1.1' or ParsedAlgorithmIdentifier.algorithm
 * @returns e.g. 'RSASSA-PKCS1-v1_5'
 */
export declare function getPublicKeyAlgorithmNameFromOid(oidStr: string): KeyAlgorithmName;
/**
 * Get NIST Standard curve from OID
 * https://www.ibm.com/docs/ja/zos/3.1.0?topic=ssl-elliptic-curve-cryptography-support
 *
 * (Most environments may implement only P-256, P-384 and P-521)
 */
export declare function getNistCurveFromOid(oidStr: string): ECNamedCurve;
/**
 * Convert ASN1(@lapo/asn1js).Binary to ArrayBuffer
 *
 * @param asn1 ASN1 object
 * @param contentOnly If true, return content only, excluding tag and length
 * @example `asn1BinaryToArrayBuffer(ASN1.decode(der).stream.enc);`
 */
export declare function asn1ToArrayBuffer(asn1: ASN1, contentOnly?: boolean): ArrayBufferLike;
export type ParsedAlgorithmIdentifierBase = {
    /**
     * Parsed algorithm, 3 lines string
     * Data from https://github.com/lapo-luchini/asn1js/blob/trunk/oids.js
     *
     * e.g.
     * ```
     * 1.3.101.112
     * curveEd25519
     * EdDSA 25519 signature algorithm
     * ```
     */
    algorithm: string;
    /**
     * Parsed parameter
     * https://github.com/lapo-luchini/asn1js/blob/408efbc4a18c786b843995746d86165c61680e80/asn1.js#L424-L487
     */
    parameter: any;
};
export type ParsedRSAIdentifier = {
    algorithm: '1.2.840.113549.1.1.1\nrsaEncryption\nPKCS #1';
    parameter: null;
};
export type ParsedEd25519Identifier = {
    der: ArrayBuffer;
    algorithm: '1.3.101.112\ncurveEd25519\nEdDSA 25519 signature algorithm';
    parameter: null;
};
export type ParsedNPrime256v1Identifier = {
    der: ArrayBuffer;
    algorithm: '1.2.840.10045.2.1\necPublicKey\nANSI X9.62 public key type';
    parameter: '1.2.840.10045.3.1.7\nprime256v1\nANSI X9.62 named elliptic curve';
};
export type ParsedAlgorithmIdentifier = ParsedRSAIdentifier | ParsedEd25519Identifier | ParsedNPrime256v1Identifier | ParsedAlgorithmIdentifierBase;
export type SpkiParsedAlgorithmIdentifier = ParsedAlgorithmIdentifierBase & {
    /**
     * DER
     *
     * (Somehow crypto.createPublicKey will cause `error:1E08010C:DECODER routines::unsupported`)
     */
    der: ArrayBuffer;
};
export declare function decodePem(input: ASN1.StreamOrBinary): Exclude<ASN1.StreamOrBinary, string>;
export declare function parseAlgorithmIdentifier(input: ASN1): ParsedAlgorithmIdentifier;
/**
 * Parse X.509 SubjectPublicKeyInfo (SPKI) public key
 * @param input SPKI public key PEM or DER
 * @returns parsed object
 */
export declare function parseSpki(input: ASN1.StreamOrBinary): SpkiParsedAlgorithmIdentifier;
/**
 * Parse X.509 SubjectPublicKeyInfo (SPKI) public key
 *
 * In Node.js, `createPublicKey(publicKey)` does not need any information,
 * but `crypto.subtle.importKey` needs to be provided by us for the key type.
 *
 * So, this function parses the SPKI and parses the type of key stored.
 *
 * If the key is PKCS#1, the function wraps it in SPKI. In that case,
 * it assumes that the algorithm is `RSASSA-PKCS1-v1_5`.
 *
 * @param input SPKI public key PEM or DER
 * @returns parsed object
 */
export declare function parsePublicKey(input: ASN1.StreamOrBinary): SpkiParsedAlgorithmIdentifier;
/**
 * Parse public key and run `crypto.subtle.importKey`
 * @param key string or ArrayBuffer
 * @param keyUsages e.g. ['verify']
 * @param defaults
 * @returns CryptoKey
 */
export declare function importPublicKey(key: ASN1.StreamOrBinary, keyUsages: webcrypto.CryptoKey['usages'], defaults?: Parameters<typeof genSignInfo>[1]): Promise<webcrypto.CryptoKey>;
