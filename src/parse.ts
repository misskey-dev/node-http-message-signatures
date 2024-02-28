import { parseDraftRequest } from '@/draft/parse.js';
import type { ClockSkewSettings, IncomingRequest } from '@/types.js';
import { lcObjectKey } from './utils.js';

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
	return !signatureHeader.includes('signature="');
}

export function checkClockSkew(reqDate: Date, options: ClockSkewSettings = { delay: 300 * 1e3, forward: 100 }) {
	const reqTime = reqDate.getTime();
	const nowDate = options.now || new Date();
	const nowTime = nowDate.getTime();
	if (reqTime > nowTime + options.forward) throw new ClockSkewInvalidError(reqDate, nowDate);
	if (reqTime < nowTime - options.delay) throw new ClockSkewInvalidError(reqDate, nowDate);
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
		checkClockSkew(new Date(request.headers['date']), clock);
	} else if (request.headers['x-date']) {
		if (Array.isArray(request.headers['x-date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(request.headers['x-date']), clock);
	}

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
