import { ASN1 } from '@lapo/asn1js';
import { asn1ToArrayBuffer, decodePem } from './spki.js';
import { genASN1Length } from '../utils.js';

export class Pkcs1ParseError extends Error {
	constructor(message: string) { super(message); }
}

/**
 * Parse PKCS#1 public key
 */
export function parsePkcs1(input: ASN1.StreamOrBinary) {
	const parsed = ASN1.decode(decodePem(input));
	if (!parsed.sub || parsed.sub.length !== 2) throw new Pkcs1ParseError('Invalid SPKI (invalid sub length)');
	const modulus = parsed.sub[0];
	const publicExponent = parsed.sub[1];
	if (!modulus || modulus.tag.tagNumber !== 0x02) throw new Pkcs1ParseError('Invalid SPKI (invalid modulus)');
	if (!publicExponent || publicExponent.tag.tagNumber !== 0x02) throw new Pkcs1ParseError('Invalid SPKI (invalid publicExponent)');

	return {
		pkcs1: asn1ToArrayBuffer(parsed),
		modulus: (asn1ToArrayBuffer(modulus, true).byteLength - 1) * 8,
		publicExponent: parseInt(publicExponent.content() || '0'),
	};
}

// 15 bytes
export const rsaASN1AlgorithmIdentifier = Uint8Array.from([
	0x30, 13,
		0x06, 9,
			42, 134, 72, 134, 247, 13, 1, 1, 1, // 1.2.840.113549.1.1.1
		0x05, 0,
]);

/**
 * Generate SPKI public key from PKCS#1 public key
 * as RSASSA-PKCS1-v1_5
 * @param input PKCS#1 public key
 * @returns SPKI public key DER
 */
export function genSpkiFromPkcs1(input: ASN1.StreamOrBinary): Uint8Array {
	const { pkcs1 } = parsePkcs1(input);
	const pkcsLength = genASN1Length(pkcs1.byteLength + 1);
	const rootContent = Uint8Array.from([
		...rsaASN1AlgorithmIdentifier,
		0x03, ...pkcsLength, // BIT STRING
			0x00, ...(new Uint8Array(pkcs1)),
	]);
	return Uint8Array.from([
		0x30, ...genASN1Length(rootContent.length), // SEQUENCE
			...rootContent,
	]);
}
