import { RequestParseOptions, validateRequestAndGetSignatureHeader } from "../parse.js";
import type { ParsedDraftSignature, IncomingRequest, RequestLike } from '../types.js';
import { genDraftSigningString } from "../draft/sign.js";

export class SignatureHeaderContentLackedError extends Error {
	constructor(lackedContent: string) { super(`Signature header content lacked: ${lackedContent}`); }
}

export class SignatureHeaderClockInvalidError extends Error {
	constructor(prop: 'created' | 'expires') { super(`Clock skew is invalid (${prop})`); }
}

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
	if (!parsed.keyId) throw new SignatureHeaderContentLackedError('keyId');
	if (!parsed.algorithm) throw new SignatureHeaderContentLackedError('algorithm');
	if (!parsed.signature) throw new SignatureHeaderContentLackedError('signature');
	if (!parsed.headers && !options?.headers) throw new SignatureHeaderContentLackedError('headers');

	if (parsed.created) {
		const createdSec = parseInt(parsed.created);
		if (isNaN(createdSec)) throw new SignatureHeaderClockInvalidError('created');
		const nowTime = (options?.clockSkew?.now || new Date()).getTime();
		if (createdSec * 1000 > nowTime + (options?.clockSkew?.forward ?? 100)) {
			throw new SignatureHeaderClockInvalidError('created');
		}
	}
	if (parsed.expires) {
		const expiresSec = parseInt(parsed.expires);
		if (isNaN(expiresSec)) throw new SignatureHeaderClockInvalidError('expires');
		const nowTime = (options?.clockSkew?.now || new Date()).getTime();
		if (expiresSec * 1000 < nowTime - (options?.clockSkew?.forward ?? 100)) {
			throw new SignatureHeaderClockInvalidError('expires');
		}
	}

	return {
		keyId: parsed.keyId!,
		algorithm: parsed.algorithm!.toLowerCase(),
		signature: parsed.signature!,
		headers: parsed.headers ? parsed.headers.split(' ') : options!.headers!,
		created: parsed.created,
		expires: parsed.expires,
		opaque: parsed.opaque,
	} as DraftSignatureHeaderParsed;
}

export function parseDraftRequest(
	request: IncomingRequest,
	options?: RequestParseOptions,
): ParsedDraftSignature {
	const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
	const parsedSignatureHeader = validateAndProcessParsedDraftSignatureHeader(parseDraftRequestSignatureHeader(signatureHeader), options);
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
