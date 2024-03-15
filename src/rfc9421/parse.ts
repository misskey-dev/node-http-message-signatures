/**
 * Parse Request
 */

import { SignatureParamsClockInvalidError, SignatureParamsContentLackedError, RequestParseOptions, validateRequestAndGetSignatureHeader, SignatureInputLackedError } from "../shared/parse.js";
import type { IncomingRequest, ParsedRFC9421SignatureValueWithBase, OutgoingResponse, SFVSignatureInputDictionary, ParsedRFC9421Signature, SFVSignatureParams } from '../types.js';
import { RFC9421SignatureBaseFactory } from './base.js';
import * as sh from 'structured-headers';

// https://datatracker.ietf.org/doc/html/rfc9421#name-signature-parameters
export const RFC9421SignatureParams = ['created', 'expires', 'nonce', 'alg', 'keyid', 'tag'] as const;

export function validateRFC9421SignatureInputParameters(input: sh.Dictionary, options?: RequestParseOptions): input is SFVSignatureInputDictionary {
	const labels = input.entries();

	for (const [, value] of labels) {
		const params = value[1];
		if (params.has('alg') && typeof params.get('alg') !== 'string') throw new SignatureParamsContentLackedError('alg');
		if (params.has('nonce') && typeof params.get('nonce') !== 'string') throw new SignatureParamsContentLackedError('nonce');
		if (params.has('tag') && typeof params.get('tag') !== 'string') throw new SignatureParamsContentLackedError('tag');

		if (params.has('created')) {
			const createdSec = params.get('created');
			if (typeof createdSec !== 'number') throw new SignatureParamsClockInvalidError('created');
			const nowTime = (options?.clockSkew?.now || new Date()).getTime();
			if (createdSec * 1000 > nowTime + (options?.clockSkew?.forward ?? 2000)) {
				throw new SignatureParamsClockInvalidError('created');
			}
		}
		if (params.has('expires')) {
			const expiresSec = params.get('expires');
			if (typeof expiresSec !== 'number') throw new SignatureParamsClockInvalidError('expires');
			const nowTime = (options?.clockSkew?.now || new Date()).getTime();
			if (expiresSec * 1000 < nowTime - (options?.clockSkew?.forward ?? 2000)) {
				throw new SignatureParamsClockInvalidError('expires');
			}
		}
	}

	return true;
}

export function parseSingleRFC9421Signature(
	label: string,
	factory: RFC9421SignatureBaseFactory<IncomingRequest | OutgoingResponse>,
	params: SFVSignatureParams,
	signature: sh.ByteSequence,
): ParsedRFC9421SignatureValueWithBase {
	const base = factory.generate(label);
	if (!params) throw new SignatureInputLackedError(`label not found: ${label}`);
	const bareKeyid = params[1].get('keyid');
	return {
		keyid: bareKeyid ?
			typeof bareKeyid === 'string' ? bareKeyid : sh.serializeBareItem(bareKeyid)
			: undefined,
		base,
		signature: signature.toBase64(),
		params: sh.serializeInnerList(params),
		algorithm: params[1].get('alg') as string | undefined,
		created: params[1].get('created') as number | undefined,
		expires: params[1].get('expires') as number | undefined,
		nonce: params[1].get('nonce') as string | undefined,
		tag: params[1].get('tag') as string | undefined,
	};
}

export function parseRFC9421RequestOrResponse(
	request: IncomingRequest | OutgoingResponse,
	options?: RequestParseOptions,
	validated?: ReturnType<typeof validateRequestAndGetSignatureHeader>
): ParsedRFC9421Signature {
	if (!validated) validated = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
	if (validated.signatureInput == null) throw new SignatureInputLackedError('signatureInput');
	const signatureDictionary = sh.parseDictionary(validated.signatureHeader);
	const signatureInput = sh.parseDictionary(validated.signatureInput);

	const inputIsValid = validateRFC9421SignatureInputParameters(signatureInput, options);
	if (!inputIsValid) throw new Error('signatureInput');

	/**
	//#region choose signature
	if (options?.algorithms?.rfc9421 && options.algorithms.rfc9421.length === 0) {
		throw new Error('No algorithms specified by options.algorithms.rfc9421');
	}
	const algorithms = options?.algorithms?.rfc9421?.map(x => x.toLowerCase());

	const labels = Array.from(signatureInput.entries())
		.reduce((acc, [label, value]) => {
			let alg = value[1].get('alg');
			if (!alg || typeof alg !== 'string') throw new Error('alg not found or not string');
			alg = alg.toLowerCase();
			if (algorithms) {
				if (!algorithms.includes(alg)) {
					return acc;
				}
			}
			if (options?.verifyAll !== true) {
				if (acc.length === 1) {
					if (!algorithms) return acc;
					const prevAlg = acc[0][1];
					if (algorithms.findIndex(v => v === prevAlg) > algorithms.findIndex(v => v === alg)) {
						acc[0] = [label, alg];
					}
				}
			}
			acc.push([label, alg]);
			return acc;
		}, [] as [string, string][])
		.map(([label]) => label);
	if (labels.length === 0) throw new Error('No valid signature found');
	**/

	const factory = new RFC9421SignatureBaseFactory(request);

	return {
		version: 'rfc9421',
		value: Array.from(signatureInput.keys()).map(label => {
			const params = signatureInput.get(label);
			if (!params) throw new Error('signature input not found (???)');

			const bs = signatureDictionary.get(label);
			if (!bs) throw new Error('signature not found');
			if (!(bs[0] instanceof sh.ByteSequence)) throw new Error('signature not ByteSequence');

			return [label, parseSingleRFC9421Signature(label, factory, params, bs[0])];
		}),
	};
	//#endregion
}
