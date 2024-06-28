/**
 * Parse Request
 */

import { SignatureParamsClockInvalidError, SignatureParamsContentLackedError, RequestParseOptions, validateRequestAndGetSignatureHeader, SignatureInputLackedError } from "../shared/parse.js";
import type { IncomingRequest, ParsedRFC9421SignatureValueWithBase, OutgoingResponse, SFVSignatureInputDictionary, ParsedRFC9421Signature, SFVSignatureParams } from '../types.js';
import { RFC9421SignatureBaseFactory } from './base.js';
import * as sh from 'structured-headers';

// https://datatracker.ietf.org/doc/html/rfc9421#name-signature-parameters
export const RFC9421SignatureParams = ['created', 'expires', 'nonce', 'alg', 'keyid', 'tag'] as const;

/**
 * Validate signature-input parameters
 * * The check of components by requiredComponents is not performed here, but is performed during Factory.generate in parseSingleRFC9421Signature.
 */
export function validateRFC9421SignatureInputParameters(
	input: sh.Dictionary,
	options?: RequestParseOptions
): input is SFVSignatureInputDictionary {
	const labels = input.entries(); // [label, [components, params]]

	for (const [, value] of labels) {
		const params = value[1]; // [components, params]
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

/**
 * Generates base and returns parsed signature.
 * * The check of components by requiredComponents will be performed here.
 */
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
	validated?: ReturnType<typeof validateRequestAndGetSignatureHeader>,
	errorLogger?: (message: any) => any,
): ParsedRFC9421Signature {
	if (!validated) validated = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
	if (validated.signatureInput == null) throw new SignatureInputLackedError('signatureInput');
	const signatureDictionary = sh.parseDictionary(validated.signatureHeader);
	const signatureInput = sh.parseDictionary(validated.signatureInput);

	const inputIsValid = validateRFC9421SignatureInputParameters(signatureInput, options);
	if (!inputIsValid) throw new Error('signatureInput');

	const factory = new RFC9421SignatureBaseFactory(
		request, undefined, undefined, undefined,
		options?.requiredComponents?.rfc9421 || options?.requiredInputs?.rfc9421,
	);
	const results = new Map<string, ParsedRFC9421SignatureValueWithBase>();

	for (const [label, params] of Array.from(signatureInput.entries())) {
		const bs = signatureDictionary.get(label);
		if (!bs) throw new Error('signature not found');
		if (!(bs[0] instanceof sh.ByteSequence)) throw new Error('signature not ByteSequence');

		try {
			results.set(label, parseSingleRFC9421Signature(label, factory, params, bs[0]));
		} catch (e) {
			if (errorLogger) errorLogger(`Error while parsing signature ${label}: ${e}`);
		}
	}

	if (results.size === 0) {
		if (options?.requiredComponents?.rfc9421 || options?.requiredInputs?.rfc9421) {
			throw new Error('No valid signature found. This may have occurred because all signatures were filtered out by requiredComponents.');
		} else {
			throw new Error('No valid signature found. Something went wrong.');
		}
	}

	return {
		version: 'rfc9421',
		value: Array.from(results.entries()),
	};
	//#endregion
}
