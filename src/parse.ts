import { parseDraftRequest } from '@/draft/parse.js';
import type { IncomingRequest } from '@/types.js';

export class SignatureHeaderNotFoundError extends Error {
	constructor() { super('Signature header not found'); }
}

export class InvalidRequestError extends Error {
	constructor(message: string) { super(message); }
}

export class RequestHasMultipleSignatureHeadersError extends Error {
	constructor() { super('Request has multiple signature headers'); }
}

/**
 * Check if request signature is based on draft
 * from the expression of the Signature header
 * @param signatureHeader Content of the Signature header
 * @returns boolean
 */
export function signatureHeaderIsDraft(signatureHeader: string) {
	return !signatureHeader.includes('signature="');
}

export function validateRequestAndGetSignatureHeader(request: IncomingRequest): string {
	if (!request.headers) throw new SignatureHeaderNotFoundError();
	const signatureHeader = request.headers['signature'];
	if (!signatureHeader) throw new SignatureHeaderNotFoundError();
	if (Array.isArray(signatureHeader)) throw new RequestHasMultipleSignatureHeadersError();

	if (!request.method) throw new InvalidRequestError('Request method not found');
	if (!request.url) throw new InvalidRequestError('Request URL not found');

	return signatureHeader;
}

/**
 * Parse the request headers
 * DraftとRFCをうまく区別してリクエストをパースする
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 */
export function parseRequest(request: IncomingRequest) {
	console.log(request.headers);
	const signatureHeader = validateRequestAndGetSignatureHeader(request);

	if (signatureHeaderIsDraft(signatureHeader)) {
		return parseDraftRequest(request);
	} else {
		throw new Error('Not implemented');
		// return parseRFC9421Request(request);
	}
}
