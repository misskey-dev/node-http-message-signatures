import { validateRequestAndGetSignatureHeader } from "@/parse.js";
import type { DraftParsedSignature, IncomingRequest, RequestLike } from '@/types.js';
import { genDraftSigningString } from "@/draft/sign.js";

export class SignatureHeaderContentLackedError extends Error {
	constructor(lackedContent: string) { super(`Signature header content lacked: ${lackedContent}`); }
}

export function parseDraftRequestSignatureHeader(signatureHeader: string): Record<string, string> {
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

function validateAndProcessParsedDraftSignatureHeader(parsed: Record<string, string>, headers?: string[]) {
	if (!parsed.keyId) throw new SignatureHeaderContentLackedError('keyId');
	if (!parsed.algorithm) throw new SignatureHeaderContentLackedError('algorithm');
	if (!parsed.signature) throw new SignatureHeaderContentLackedError('signature');
	if (!parsed.headers && !headers) throw new SignatureHeaderContentLackedError('headers');

	return {
		keyId: parsed.keyId,
		algorithm: parsed.algorithm.toLowerCase(),
		signature: parsed.signature,
		headers: parsed.headers ? parsed.headers.split(' ') : headers!,
	};
}

export function parseDraftRequest(
	request: IncomingRequest,
	options: { headers?: string[]; clockSkew?: number } = { clockSkew: 300 },
): DraftParsedSignature {
	const signatureHeader = validateRequestAndGetSignatureHeader(request);
	const parsedSignatureHeader = validateAndProcessParsedDraftSignatureHeader(parseDraftRequestSignatureHeader(signatureHeader), options.headers);
	const signingString = genDraftSigningString(request as RequestLike, parsedSignatureHeader.headers);
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
