import type { IncomingRequest, MapLikeObj, OutgoingResponse, PrivateKey, SFVSignatureParamsForInput, SignatureHashAlgorithmUpperSnake } from '../types.js';
import { type SignInfoDefaults } from '../utils.js';
import { SFVHeaderTypeDictionary } from './sfv.js';
import * as sh from 'structured-headers';
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
/**
 * Get the algorithm string for RFC 9421 encoding
 * https://datatracker.ietf.org/doc/html/rfc9421#name-http-signature-algorithms-r
 * @param keyAlgorithm Comes from `privateKey.algorithm.name` e.g. 'RSASSA-PKCS1-v1_5'
 * @param hashAlgorithm e.g. 'SHA-256'
 * @returns string e.g. 'rsa-v1_5-sha256'
 */
export declare function getRFC9421AlgoString(keyAlgorithm: CryptoKey['algorithm'], hashAlgorithm: SignatureHashAlgorithmUpperSnake): "ed25519" | "rsa-v1_5-sha256" | "ecdsa-p256-sha256" | "ecdsa-p384-sha384" | "rsa-v1_5-sha512";
export declare function processSingleRFC9421SignSource(source: RFC9421SignSource): Promise<{
    key: CryptoKey;
    params: SFVSignatureParamsForInput;
}>;
/**
 *
 * @param request Request object to sign
 * @param sources MapLikeObj<label, RFC9421SiginingOptions>
 * @param signatureBaseOptions Options for RFC9421SignatureBaseFactory
 * @param opts
 * @returns result object
 */
export declare function signAsRFC9421ToRequestOrResponse(request: IncomingRequest | OutgoingResponse, sources: MapLikeObj<string, RFC9421SignSource>, signatureBaseOptions?: {
    scheme?: string;
    additionalSfvTypeDictionary?: SFVHeaderTypeDictionary;
    request?: Request;
}): Promise<{
    inputHeader: string;
    signatureHeader: string;
    signatureDictionary: Map<string, [sh.ByteSequence, Map<any, any>]>;
    signatureBases: Map<string, string>;
}>;
