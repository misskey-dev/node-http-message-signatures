import { parseDraftRequest } from './draft/parse.js';
import type { ClockSkewSettings, IncomingRequest } from './types.js';

export type RequestParseOptions = {
	headers?: string[];
	clockSkew?: ClockSkewSettings;
};

export class SignatureHeaderNotFoundError extends Error {
	constructor() { super('Signature header not found'); }
}

export class InvalidRequestError extends Error {
	constructor(message: string) { super(message); }
}

export class RequestHasMultipleSignatureHeadersError extends Error {
	constructor() { super('Request has multiple signature headers'); }
}

export class RequestHasMultipleDateHeadersError extends Error {
	constructor() { super('Request has multiple date headers'); }
}

export class ClockSkewInvalidError extends Error {
	constructor(reqDate: Date, nowDate: Date) { super(`Clock skew is invalid: request="${reqDate.toJSON()}",now="${nowDate.toJSON()}",diff="${nowDate.getTime() - reqDate.getTime()}"`); }
}

/**
 * Check if request signature is based on draft
 * from the expression of the Signature header
 * @param signatureHeader Content of the Signature header
 * @returns boolean
 */
export function signatureHeaderIsDraft(signatureHeader: string) {
	return signatureHeader.includes('signature="');
}

/**
 * Check the clock skew of the request
 * @param reqDate Request date
 * @param nowDate Now date
 * @param delay Tolerance of Request's delay (ms)
 * @param forward Tolerance of request's forward (ms)
 */
export function checkClockSkew(reqDate: Date, nowDate: Date, delay: number = 300 * 1e3, forward: number = 100) {
	const reqTime = reqDate.getTime();
	const nowTime = nowDate.getTime();
	if (reqTime > nowTime + forward) throw new ClockSkewInvalidError(reqDate, nowDate);
	if (reqTime < nowTime - delay) throw new ClockSkewInvalidError(reqDate, nowDate);
}

export function validateRequestAndGetSignatureHeader(
	request: IncomingRequest,
	clock?: ClockSkewSettings,
): string {
	if (!request.headers) throw new SignatureHeaderNotFoundError();
	const signatureHeader = request.headers['signature'] || request.headers['Signature'];
	if (!signatureHeader) throw new SignatureHeaderNotFoundError();
	if (Array.isArray(signatureHeader)) throw new RequestHasMultipleSignatureHeadersError();

	if (request.headers['date']) {
		if (Array.isArray(request.headers['date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(request.headers['date']), clock?.now || new Date(), clock?.delay, clock?.forward);
	} else if (request.headers['x-date']) {
		if (Array.isArray(request.headers['x-date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(request.headers['x-date']), clock?.now || new Date(), clock?.delay, clock?.forward);
	}

	if (!request.method) throw new InvalidRequestError('Request method not found');
	if (!request.url) throw new InvalidRequestError('Request URL not found');

	return signatureHeader;
}

/**
 * Parse the request headers
 * DraftとRFCをうまく区別してリクエストをパースする
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 * @param options
 */
export function parseRequest(request: IncomingRequest, options?: RequestParseOptions) {
	const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);

	if (signatureHeaderIsDraft(signatureHeader)) {
		return parseDraftRequest(request, options);
	} else {
		throw new Error('Not implemented');
		// return parseRFC9421Request(request, options);
	}
}
