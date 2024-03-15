import { parseRFC9421RequestOrResponse } from 'src/rfc9421/parse.js';
import { parseDraftRequest } from '../draft/parse.js';
import type { ClockSkewSettings, IncomingRequest, OutgoingResponse, ParsedSignature } from '../types.js';
import { canonicalizeHeaderValue, collectHeaders, isBrowserResponse } from '../utils.js';

export type RequestParseOptions = {
	/**
	 * Headers should be included in the signature string
	 */
	requiredComponents?: {
		draft?: string[];
		rfc9421?: string[];
	};
	/**
	 * @deprecated Use `requiredComponents` instead
	 */
	requiredInputs?: {
		draft?: string[];
		rfc9421?: string[];
	};
	clockSkew?: ClockSkewSettings;
};

//#region parse errors
export class HTTPMessageSignaturesParseError extends Error {
	constructor(message: string) { super(message); }
}

export class SignatureHeaderNotFoundError extends HTTPMessageSignaturesParseError {
	constructor() { super('Signature header not found'); }
}

export class InvalidRequestError extends HTTPMessageSignaturesParseError {
	constructor(message: string) { super(message); }
}

export class RequestHasMultipleSignatureHeadersError extends HTTPMessageSignaturesParseError {
	constructor() { super('Request has multiple signature headers'); }
}

export class RequestHasMultipleDateHeadersError extends HTTPMessageSignaturesParseError {
	constructor() { super('Request has multiple date headers'); }
}

export class ClockSkewInvalidError extends HTTPMessageSignaturesParseError {
	constructor(reqDate: Date, nowDate: Date) { super(`Clock skew is invalid: request="${reqDate.toJSON()}",now="${nowDate.toJSON()}",diff="${nowDate.getTime() - reqDate.getTime()}"`); }
}

export class UnknownSignatureHeaderFormatError extends HTTPMessageSignaturesParseError {
	constructor() { super('Unknown signature header format'); }
}

//#region draft parse errors
// ここに書かないと循環参照でCannot access 'HTTPMessageSignaturesParseError' before initializationになる
export class SignatureParamsContentLackedError extends HTTPMessageSignaturesParseError {
	constructor(lackedContent: string) { super(`Signature header content lacked: ${lackedContent}`); }
}

export class SignatureParamsClockInvalidError extends HTTPMessageSignaturesParseError {
	constructor(prop: 'created' | 'expires') { super(`Clock skew is invalid (${prop})`); }
}
//#endregion

//#region rfc9421 parse errors
export class SignatureInputLackedError extends HTTPMessageSignaturesParseError {
	constructor(message: any) { super(message); }
}
//#endregion

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
 * @param delay Tolerance of request's clock delay (ms)
 * @param forward Tolerance of request's clock forwarding (ms)
 */
export function checkClockSkew(reqDate: Date, nowDate: Date, delay: number = 300 * 1e3, forward: number = 2000) {
	const reqTime = reqDate.getTime();
	const nowTime = nowDate.getTime();
	if (reqTime > nowTime + forward) throw new ClockSkewInvalidError(reqDate, nowDate);
	if (reqTime < nowTime - delay) throw new ClockSkewInvalidError(reqDate, nowDate);
}

/**
 * Check clock skew and get the signature and signature-input header
 */
export function validateRequestAndGetSignatureHeader(
	source: IncomingRequest | OutgoingResponse,
	clock?: ClockSkewSettings,
) {
	const headers = collectHeaders(source);

	if (headers['date']) {
		checkClockSkew(new Date(canonicalizeHeaderValue(headers['date'])), clock?.now || new Date(), clock?.delay, clock?.forward);
	} else if (headers['x-date']) {
		if (Array.isArray(headers['x-date'])) throw new RequestHasMultipleDateHeadersError();
		checkClockSkew(new Date(canonicalizeHeaderValue(headers['date'])), clock?.now || new Date(), clock?.delay, clock?.forward);
	}

	const request = 'req' in source ? source.req : source;
	if (!isBrowserResponse(request) && !('method' in request)) {
		throw new InvalidRequestError('Request method not found');
	}
	if (!request.url) throw new InvalidRequestError('Request URL not found');

	let signatureHeader = 'signature' in headers ? canonicalizeHeaderValue(headers['signature']) : null;

	/**
	 * Joyent spec uses `Authorization` header
	 * https://github.com/TritonDataCenter/node-http-signature/blob/master/http_signing.md#default-parameterization
	 */
	const authorizationHeader = canonicalizeHeaderValue(headers['authorization']);
	if (authorizationHeader) {
		if (authorizationHeader.startsWith('Signature ')) {
			signatureHeader = authorizationHeader.slice(10);
		}
	}

	if (!signatureHeader) {
		throw new SignatureHeaderNotFoundError();
	}

	return {
		signatureHeader,
		signatureInput: 'signature-input' in headers ? canonicalizeHeaderValue(headers['signature-input']) : null,
		headers,
	};
}

/**
 * Parse request headers with Draft and RFC discrimination
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 * @param options
 */
export function parseRequestSignature(request: IncomingRequest, options?: RequestParseOptions): ParsedSignature {
	const validated = validateRequestAndGetSignatureHeader(request, options?.clockSkew);

	if (validated.signatureInput != null) {
		return parseRFC9421RequestOrResponse(request, options);
	} else if (signatureHeaderIsDraft(validated.signatureHeader)) {
		return parseDraftRequest(request, options, validated);
	}
	throw new UnknownSignatureHeaderFormatError();
}
