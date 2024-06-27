import type { IncomingRequest, OutgoingResponse, PrivateKey, SFVSignatureParamsForInput, SignatureHashAlgorithmUpperSnake } from '../types.js';
import { type SignInfoDefaults, defaultSignInfoDefaults, setHeaderToRequestOrResponse } from '../utils.js';
import { importPrivateKey } from '../pem/pkcs8.js';
import { RFC9421SignatureBaseFactory, convertSignatureParamsDictionary } from './base.js';
import { SFVHeaderTypeDictionary } from './sfv.js';
import * as sh from 'structured-headers';
import { genSignature } from '../shared/sign.js';

/**
 * Get the algorithm string for RFC 9421 encoding
 * https://datatracker.ietf.org/doc/html/rfc9421#name-http-signature-algorithms-r
 * @param keyAlgorithm Comes from `privateKey.algorithm.name` e.g. 'RSASSA-PKCS1-v1_5'
 * @param hashAlgorithm e.g. 'SHA-256'
 * @returns string e.g. 'rsa-v1_5-sha256'
 */
export function getRFC9421AlgoString(keyAlgorithm: CryptoKey['algorithm'], hashAlgorithm: SignatureHashAlgorithmUpperSnake) {
	if (typeof keyAlgorithm === 'string') {
		keyAlgorithm = { name: keyAlgorithm };
	}

	if (keyAlgorithm.name === 'RSASSA-PKCS1-v1_5') {
		if (hashAlgorithm === 'SHA-256') return 'rsa-v1_5-sha256';
		if (hashAlgorithm === 'SHA-512') return 'rsa-v1_5-sha512';
		throw new Error(`unsupported hash: ${hashAlgorithm}`);
	}
	if (keyAlgorithm.name === 'ECDSA') {
		if ((keyAlgorithm as EcKeyAlgorithm).namedCurve === 'P-256' && hashAlgorithm === 'SHA-256') {
			return `ecdsa-p256-sha256`;
		}
		if ((keyAlgorithm as EcKeyAlgorithm).namedCurve === 'P-384' && hashAlgorithm === 'SHA-384') {
			return `ecdsa-p384-sha384`;
		}
		throw new Error(`unsupported curve(${(keyAlgorithm as any).namedCurve}) or hash(${hashAlgorithm})`);
	}
	if (keyAlgorithm.name === 'Ed25519') {
		return `ed25519`; // Joyent/@peertube/http-signatureではこう指定する必要がある
	}
	throw new Error(`unsupported keyAlgorithm(${JSON.stringify(keyAlgorithm)}) or hash(${hashAlgorithm})`);
}

export type RFC9421SignSource = {
	key: PrivateKey;
	defaults?: SignInfoDefaults;
	/**
	 * @examples
	 *	```
	 *	[
	 *		'@method',
	 *		[
	 *			'@query-param',
	 *			{ name: 'foo' },
	 *		],
	 *	]
	 *	```
	 */
	identifiers: SFVSignatureParamsForInput[0];
	/**
	 * seconds, unix time
	 * @default `Math.round(Date.now() / 1000)`
	 */
	created?: number;
	/**
	 * seconds from `created`
	 * @default (not set, no expiration)
	 */
	expiresAfter?: number;
	/**
	 * TODO
	 */
	nonce?: string;
	/**
	 * tag
	 */
	tag?: string;
};

export async function processSingleRFC9421SignSource(source: RFC9421SignSource) {
	const defaults = source.defaults ?? defaultSignInfoDefaults;
	const privateKey = 'privateKey' in source.key ?
		source.key.privateKey
		: await importPrivateKey(source.key.privateKeyPem, ['sign'], defaults);
	const alg = getRFC9421AlgoString(privateKey.algorithm, defaults.hash);
	const created = source.created ?? Math.round(Date.now() / 1000);
	const expires = source.expiresAfter ? created + source.expiresAfter : undefined;

	return {
		key: privateKey,
		params: [
			source.identifiers,
			{
				keyid: source.key.keyId,
				alg,
				created,
				expires,
				nonce: source.nonce,
				tag: source.tag,
			},
		] as SFVSignatureParamsForInput,
	};
}

/**
 *
 * @param request Request object to sign
 * @param sources Map<label, RFC9421SiginingOptions>
 * @param signatureBaseOptions Options for RFC9421SignatureBaseFactory
 * @param opts
 * @returns result object
 */
export async function signAsRFC9421ToRequestOrResponse(
	request: IncomingRequest | OutgoingResponse,
	sources: Map<string, RFC9421SignSource>,
	signatureBaseOptions: {
		// e.g. https
		scheme?: string;
		additionalSfvTypeDictionary?: SFVHeaderTypeDictionary;
		request?: Request;
	} = {
			scheme: 'https',
			additionalSfvTypeDictionary: {}
		},
) {
	const keys = new Map<string, CryptoKey>;
	const inputDictionary = new Map<string, SFVSignatureParamsForInput>();
	for (const [label, source] of sources) {
		const { key, params } = await processSingleRFC9421SignSource(source);
		keys.set(label, key);
		inputDictionary.set(label, params);
	}

	const inputHeader = convertSignatureParamsDictionary(inputDictionary);
	setHeaderToRequestOrResponse(request, 'Signature-Input', inputHeader);

	const factory = new RFC9421SignatureBaseFactory(
		request,
		signatureBaseOptions.scheme,
		signatureBaseOptions.additionalSfvTypeDictionary,
		signatureBaseOptions.request
	);

	const signaturesEntries = (factory.isRequest() ? factory.requestSignatureInput : factory.responseSignatureInput!)?.keys();
	if (!signaturesEntries) throw new Error(`signaturesEntries is undefined`);

	const signatureDictionary = new Map<string, [sh.ByteSequence, Map<any, any>]>();
	const signatureBases = new Map<string, string>();
	for (const label of signaturesEntries) {
		const base = factory.generate(label);
		const key = keys.get(label);
		if (!key) throw new Error(`key not found: ${label}`);
		signatureBases.set(label, base);
		signatureDictionary.set(label, [
			new sh.ByteSequence(
				await genSignature(key, base, sources.get(label)?.defaults ?? defaultSignInfoDefaults)
			),
			new Map(),
		]);
	}

	const signatureHeader = sh.serializeDictionary(signatureDictionary);
	setHeaderToRequestOrResponse(request, 'Signature', signatureHeader);

	return {
		inputHeader,
		signatureHeader,
		signatureDictionary,
		signatureBases,
	};
}
