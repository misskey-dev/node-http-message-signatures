//@ts-expect-error 2317
import { ASN1 } from '@lapo/asn1js';
import { Hex } from '@lapo/asn1js/hex.js';
import { Base64 } from '@lapo/asn1js/base64.js';
import { genSpkiFromPkcs1, parsePkcs1 } from './pkcs1.js';
import { ECNamedCurve, KeyAlgorithmName } from '../types.js';
import { SignInfoDefaults, defaultSignInfoDefaults, genAlgorithmForSignAndVerify, genSignInfo, getWebcrypto } from '../utils.js';
import { parseSignInfo } from '../shared/verify.js';

export class SpkiParseError extends Error {
	constructor(message: string) { super(message); }
}

/**
 * Get algorithm name from OID
 * https://datatracker.ietf.org/doc/html/rfc3279#section-2.3
 * https://datatracker.ietf.org/doc/html/rfc8420#appendix-A
 * @param oidStr e.g. '1.2.840.113549.1.1.1' or ParsedAlgorithmIdentifier.algorithm
 * @returns e.g. 'RSASSA-PKCS1-v1_5'
 */
export function getPublicKeyAlgorithmNameFromOid(oidStr: string): KeyAlgorithmName {
	const oid = oidStr.split('\n')[0].trim();
	if (oid === '1.2.840.113549.1.1.1') return 'RSASSA-PKCS1-v1_5';
	if (oid === '1.2.840.113549.1.1.7') return 'RSA-PSS';
	if (oid === '1.2.840.10040.4.1') return 'DSA';
	if (oid === '1.2.840.10046.2.1') return 'DH';
	if (oid === '2.16.840.1.101.2.1.1.22') return 'KEA';
	if (oid === '1.2.840.10045.2.1') return 'EC';
	if (oid === '1.3.101.112') return 'Ed25519';
	if (oid === '1.3.101.113') return 'Ed448';
	throw new SpkiParseError('Unknown Public Key Algorithm OID');
}

/**
 * Get NIST Standard curve from OID
 * https://www.ibm.com/docs/ja/zos/3.1.0?topic=ssl-elliptic-curve-cryptography-support
 *
 * (Most environments may implement only P-256, P-384 and P-521)
 */
export function getNistCurveFromOid(oidStr: string): ECNamedCurve {
	const oid = oidStr.split('\n')[0].trim();
	if (oid === '1.2.840.10045.3.1.1') return 'P-192';
	if (oid === '1.3.132.0.33') return 'P-224';
	if (oid === '1.2.840.10045.3.1.7') return 'P-256';
	if (oid === '1.3.132.0.34') return 'P-384';
	if (oid === '1.3.132.0.35') return 'P-521';
	throw new SpkiParseError('Unknown Named Curve OID');
}

/**
 * Convert ASN1(@lapo/asn1js).Binary to ArrayBuffer
 *
 * @param asn1 ASN1 object
 * @param contentOnly If true, return content only, excluding tag and length
 * @example `asn1BinaryToArrayBuffer(ASN1.decode(der).stream.enc);`
 */
export function asn1ToArrayBuffer(asn1: ASN1, contentOnly = false) {
	const fullEnc = asn1.stream.enc;
	const start = contentOnly ? asn1.posContent() : asn1.posStart();
	const end = asn1.posEnd();

	if (typeof fullEnc === 'string') {
		// enc is binary string
		return Uint8Array.from(fullEnc.slice(start, end), s => s.charCodeAt(0)).buffer;
	} else if (fullEnc instanceof Uint8Array) {
		return fullEnc.buffer.slice(start, end);
	} if (fullEnc instanceof ArrayBuffer) {
		return new Uint8Array(fullEnc.slice(start, end)).buffer;
	} else if (Array.isArray(fullEnc)) {
		return new Uint8Array(fullEnc.slice(start, end)).buffer;
	}
	throw new SpkiParseError('Invalid SPKI (invalid ASN1 Stream data)');
}

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
	algorithm: '1.3.101.112\ncurveEd25519\nEdDSA 25519 signature algorithm',
	parameter: null;
}
export type ParsedNPrime256v1Identifier = {
	der: ArrayBuffer;
	algorithm: '1.2.840.10045.2.1\necPublicKey\nANSI X9.62 public key type',
  parameter: '1.2.840.10045.3.1.7\nprime256v1\nANSI X9.62 named elliptic curve'
}

export type ParsedAlgorithmIdentifier =
	| ParsedRSAIdentifier
	| ParsedEd25519Identifier
	| ParsedNPrime256v1Identifier
	| ParsedAlgorithmIdentifierBase;

export type SpkiParsedAlgorithmIdentifier = ParsedAlgorithmIdentifierBase & {
	/**
	 * DER
	 *
	 * (Somehow crypto.createPublicKey will cause `error:1E08010C:DECODER routines::unsupported`)
	 */
	der: ArrayBuffer;
};

const reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;

export function decodePem(input: ASN1.StreamOrBinary): Exclude<ASN1.StreamOrBinary, string> {
	const der = typeof input === 'string' ?
		reHex.test(input) ?
			Hex.decode(input) :
			Base64.unarmor(input) :
		input;
	return der;
}

export function parseAlgorithmIdentifier(input: ASN1): ParsedAlgorithmIdentifier {
	const algorithmIdentifierSub = input.sub;
	if (!algorithmIdentifierSub) throw new SpkiParseError('Invalid AlgorithmIdentifier');
	if (algorithmIdentifierSub.length === 0) throw new SpkiParseError('Invalid AlgorithmIdentifier (sub length, zero)');
	if (algorithmIdentifierSub.length > 2) throw new SpkiParseError('Invalid AlgorithmIdentifier (sub length, too many)');
	if (algorithmIdentifierSub[0].tag.tagNumber !== 0x06) throw new SpkiParseError('Invalid AlgorithmIdentifier (.sub[0] type)');

	const algorithm = algorithmIdentifierSub[0]?.content() ?? null;
	if (typeof algorithm !== 'string') throw new SpkiParseError('Invalid AlgorithmIdentifier (invalid content)');
	const parameter = algorithmIdentifierSub[1]?.content() ?? null;

	return {
		algorithm,
		parameter,
	};
}
/**
 * Parse X.509 SubjectPublicKeyInfo (SPKI) public key
 * @param input SPKI public key PEM or DER
 * @returns parsed object
 */
export function parseSpki(input: ASN1.StreamOrBinary): SpkiParsedAlgorithmIdentifier {
	const parsed = ASN1.decode(decodePem(input));
	if (!parsed.sub || parsed.sub.length === 0 || parsed.sub.length > 2) throw new SpkiParseError('Invalid SPKI (invalid sub)');

	return {
		der: asn1ToArrayBuffer(parsed),
		...parseAlgorithmIdentifier(parsed.sub[0]),
	};
}

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
export function parsePublicKey(input: ASN1.StreamOrBinary): SpkiParsedAlgorithmIdentifier {
	try {
		// Try to parse as SPKI
		return parseSpki(input);
	} catch (e) {
		try {
			// Try to parse as PKCS#1
			const { pkcs1 } = parsePkcs1(input);
			const spki = genSpkiFromPkcs1(new Uint8Array(pkcs1));
			return parseSpki(spki);
		} catch (e2) {
			throw new SpkiParseError('Invalid SPKI or PKCS#1');
		}
	}
}

/**
 * Parse public key and run `crypto.subtle.importKey`
 * @param key string or ArrayBuffer
 * @param keyUsages e.g. ['verify']
 * @param defaults
 * @returns CryptoKey
 */
export async function importPublicKey(key: ASN1.StreamOrBinary, keyUsages: KeyUsage[] = ['verify'], defaults: SignInfoDefaults = defaultSignInfoDefaults, extractable = false) {
	const parsedPublicKey = parsePublicKey(key);
	return await (await getWebcrypto()).subtle.importKey('spki', parsedPublicKey.der, genSignInfo(parsedPublicKey, defaults), extractable, keyUsages);
}

/**
 * Prepare public key for verification
 * @param source PEM, DER or CryptoKey
 * @param keyUsages e.g. ['verify']
 * @param providedAlgorithm e.g. 'rsa-sha256' or 'rsa-v1_5-sha256
 * @param errorLogger
 * @returns
 */
export async function parseAndImportPublicKey(
	source: ASN1.StreamOrBinary | CryptoKey,
	keyUsages: KeyUsage[] = ['verify'],
	providedAlgorithm?: string,
	errorLogger?: ((message: any) => any)
) {
	if (
		typeof source === 'string' ||
		(
			typeof source === 'object' && !('type' in source) &&
			(source instanceof Uint8Array || source instanceof ArrayBuffer || Array.isArray(source) || 'enc' in source)
		)
	) {
		// Not a CryptoKey
		const keyAlgorithmIdentifier = parsePublicKey(source);
		const signInfo = parseSignInfo(providedAlgorithm, keyAlgorithmIdentifier, errorLogger);
		const publicKey = await (await getWebcrypto()).subtle.importKey('spki', keyAlgorithmIdentifier.der, signInfo, false, keyUsages);
		return {
			publicKey,
			algorithm: genAlgorithmForSignAndVerify(publicKey.algorithm, 'hash' in signInfo ? signInfo.hash : null),
		};
	}

	// Is a CryptoKey
	const signInfo = parseSignInfo(providedAlgorithm, source.algorithm, errorLogger);
	return {
		publicKey: source,
		algorithm: genAlgorithmForSignAndVerify(source.algorithm, 'hash' in signInfo ? signInfo.hash : null),
	};
}
