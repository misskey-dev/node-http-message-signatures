import ASN1 from '@lapo/asn1js';
import { asn1ToArrayBuffer, decodePem, parseAlgorithmIdentifier } from './spki';

export class Pkcs8ParseError extends Error {
	constructor(message: string) { super(message); }
}

/**
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
export function parsePkcs8(input: ASN1.StreamOrBinary) {
	const parsed = ASN1.decode(decodePem(input));
	if (!parsed.sub || parsed.sub.length < 3) throw new Pkcs8ParseError('Invalid PKCS#8 (invalid sub length)');
	const version = parsed.sub[0];
	if (!version || !version.tag || version.tag.tagNumber !== 0x02) throw new Pkcs8ParseError('Invalid PKCS#8 (invalid version)');
	const privateKeyAlgorithm = parseAlgorithmIdentifier(parsed.sub[1]);
	const privateKey = parsed.sub[2];
	if (!privateKey || !privateKey.tag || privateKey.tag.tagNumber !== 0x04) throw new Pkcs8ParseError('Invalid PKCS#8 (invalid privateKey)');
	const attributes = parsed.sub[3];
	if (attributes) {
		if (attributes.tag.tagNumber !== 0x31) throw new Pkcs8ParseError('Invalid PKCS#8 (invalid attributes)');
	}

	return {
		privateKey: asn1ToArrayBuffer(privateKey),
		...privateKeyAlgorithm,
		attributesRaw: attributes ? asn1ToArrayBuffer(attributes) : null,
	};
}
