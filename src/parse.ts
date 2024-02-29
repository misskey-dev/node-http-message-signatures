import { parseDraftRequest } from './draft/parse.js';
import type { ClockSkewSettings, IncomingRequest } from './types.js';
import { lcObjectKey, objectLcKeys } from './utils.js';

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
 * Check if request is based on RFC 9421
 */
export function requestIsRFC9421(request: IncomingRequest) {
	return objectLcKeys(request.headers).has('signature-input');
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
	const headers = lcObjectKey(request.headers);
	const signatureHeader = headers['signature'];
	if (!signatureHeader) throw new SignatureHeaderNotFoundError();
	if (Array.isArray(signatureHeader)) throw new RequestHasMultipleSignatureHeadersError();

	if (headers['date']) {
		if (Array.isArray(headers['date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(headers['date']), clock?.now || new Date(), clock?.delay, clock?.forward);
	} else if (headers['x-date']) {
		if (Array.isArray(headers['x-date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(headers['x-date']), clock?.now || new Date(), clock?.delay, clock?.forward);
	}

	if (!request.method) throw new InvalidRequestError('Request method not found');
	if (!request.url) throw new InvalidRequestError('Request URL not found');

	return signatureHeader;
}

/**
 * Parse request headers with Draft and RFC discrimination
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 * @param options
 */
export function parseRequestSignature(request: IncomingRequest, options?: RequestParseOptions) {
	const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);

	if (requestIsRFC9421(request)) {
		throw new Error('Not implemented');
		// return parseRFC9421Request(request, options);
	} else if (signatureHeaderIsDraft(signatureHeader)) {
		return parseDraftRequest(request, options);
	}
	return null;
}
