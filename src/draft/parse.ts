/**
 * Parse Request
 */

import { SignatureParamsClockInvalidError, SignatureParamsContentLackedError, RequestParseOptions, validateRequestAndGetSignatureHeader } from "../shared/parse.js";
import type { ParsedDraftSignature, IncomingRequest, RequestLike } from '../types.js';
import { genDraftSigningString } from './string.js';

export const DraftSignatureHeaderKeys = ['keyId', 'algorithm', 'created', 'expires', 'opaque', 'headers', 'signature'] as const;
export type DraftSignatureHeaderParsedRaw = {
	[key in typeof DraftSignatureHeaderKeys[number]]?: string;
};
export type DraftSignatureHeaderParsed = {
	keyId: string;
	algorithm: string;
	signature: string;
	headers: string[];
	created?: string;
	expires?: string;
	opaque?: string;
};

export function parseDraftRequestSignatureHeader(signatureHeader: string): DraftSignatureHeaderParsedRaw {
	const result: Record<string, string> = {};
	let prevStatus = 'none' as 'none' | 'name' | 'equal' | 'startQuote' | 'value' | 'valueWithoutQuote' | 'endQuote';
	let currentKey = '';
	let currentValue = '';

	const spaceRegex = /\s/;

	for (let i = 0; i < signatureHeader.length; i++) {
		const char = signatureHeader[i];
		if (prevStatus === 'none') {
			if (char === ',') continue;
			if (spaceRegex.test(char)) continue;
			prevStatus = 'name';
			currentKey = char;
		} else if (prevStatus === 'name') {
			if (char === '=') {
				prevStatus = 'equal';
			} else {
				currentKey = `${currentKey}${char}`;
			}
		} else if (prevStatus === 'equal') {
			if (char === '"') {
				prevStatus = 'startQuote';
			} else {
				// quoteを端折った
				prevStatus = 'valueWithoutQuote';
				currentValue = char;
			}
		} else if (prevStatus === 'startQuote') {
			if (char === '"') {
				prevStatus = 'endQuote';
				result[currentKey] = currentValue;
				currentKey = '';
				currentValue = '';
			} else {
				prevStatus = 'value';
				currentValue = char;
			}
		} else if (prevStatus === 'value') {
			if (char === '"') {
				prevStatus = 'endQuote';
				result[currentKey] = currentValue;
				currentKey = '';
				currentValue = '';
			} else {
				currentValue = `${currentValue}${char}`;
			}
		} else if (prevStatus === 'valueWithoutQuote') {
			if (char === ',') {
				prevStatus = 'none';
				result[currentKey] = currentValue;
				currentKey = '';
				currentValue = '';
			}
		} else if (prevStatus === 'endQuote') {
			prevStatus = 'none';
		}
	}

	return result;
}

export function validateAndProcessParsedDraftSignatureHeader(parsed: DraftSignatureHeaderParsedRaw, options?: RequestParseOptions) {
	if (!parsed.keyId) throw new SignatureParamsContentLackedError('keyId');
	if (!parsed.algorithm) throw new SignatureParamsContentLackedError('algorithm');
	if (!parsed.signature) throw new SignatureParamsContentLackedError('signature');
	if (!parsed.headers) throw new SignatureParamsContentLackedError('headers');
	const headersArray = parsed.headers.split(' ');
	const requiredHeaders = options?.requiredComponents?.draft || options?.requiredInputs?.draft;
	if (requiredHeaders) {
		for (const requiredInput of requiredHeaders) {
			if (requiredInput === 'x-date' || requiredInput === 'date') {
				// dateとx-dateは相互に読み替える
				if (headersArray.includes('date')) continue;
				if (headersArray.includes('x-date')) continue;
				throw new SignatureParamsContentLackedError(`headers.${requiredInput}`);
			}
			if (!headersArray.includes(requiredInput)) throw new SignatureParamsContentLackedError(`headers.${requiredInput}`);
		}
	}

	if (parsed.created) {
		const createdSec = parseInt(parsed.created);
		if (isNaN(createdSec)) throw new SignatureParamsClockInvalidError('created');
		const nowTime = (options?.clockSkew?.now || new Date()).getTime();
		if (createdSec * 1000 > nowTime + (options?.clockSkew?.forward ?? 2000)) {
			throw new SignatureParamsClockInvalidError('created');
		}
	}
	if (parsed.expires) {
		const expiresSec = parseInt(parsed.expires);
		if (isNaN(expiresSec)) throw new SignatureParamsClockInvalidError('expires');
		const nowTime = (options?.clockSkew?.now || new Date()).getTime();
		if (expiresSec * 1000 < nowTime - (options?.clockSkew?.forward ?? 2000)) {
			throw new SignatureParamsClockInvalidError('expires');
		}
	}

	return {
		keyId: parsed.keyId!,
		algorithm: parsed.algorithm!.toLowerCase(),
		signature: parsed.signature!,
		headers: headersArray,
		created: parsed.created,
		expires: parsed.expires,
		opaque: parsed.opaque,
	} as DraftSignatureHeaderParsed;
}

export function parseDraftRequest(
	request: IncomingRequest,
	options?: RequestParseOptions,
	validated?: ReturnType<typeof validateRequestAndGetSignatureHeader>,
): ParsedDraftSignature {
	if (!validated) validated = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
	const parsedSignatureHeader = validateAndProcessParsedDraftSignatureHeader(parseDraftRequestSignatureHeader(validated.signatureHeader), options);
	const signingString = genDraftSigningString(
		request as RequestLike,
		parsedSignatureHeader.headers,
		{
			keyId: parsedSignatureHeader.keyId,
			algorithm: parsedSignatureHeader.algorithm,
			created: parsedSignatureHeader.created,
			expires: parsedSignatureHeader.expires,
			opaque: parsedSignatureHeader.opaque,
		}
	);
	return {
		version: 'draft',
		value: {
			scheme: 'Signature',
			params: parsedSignatureHeader,
			signingString,
			algorithm: parsedSignatureHeader.algorithm.toUpperCase(),
			keyId: parsedSignatureHeader.keyId,
		}
	};
}
