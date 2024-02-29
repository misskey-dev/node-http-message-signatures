import type { ClockSkewSettings, IncomingRequest } from './types.js';
export type RequestParseOptions = {
    headers?: string[];
    clockSkew?: ClockSkewSettings;
};
export declare class SignatureHeaderNotFoundError extends Error {
    constructor();
}
export declare class InvalidRequestError extends Error {
    constructor(message: string);
}
export declare class RequestHasMultipleSignatureHeadersError extends Error {
    constructor();
}
export declare class RequestHasMultipleDateHeadersError extends Error {
    constructor();
}
export declare class ClockSkewInvalidError extends Error {
    constructor(reqDate: Date, nowDate: Date);
}
/**
 * Check if request signature is based on draft
 * from the expression of the Signature header
 * @param signatureHeader Content of the Signature header
 * @returns boolean
 */
export declare function signatureHeaderIsDraft(signatureHeader: string): boolean;
/**
 * Check the clock skew of the request
 * @param reqDate Request date
 * @param nowDate Now date
 * @param delay Tolerance of Request's delay (ms)
 * @param forward Tolerance of request's forward (ms)
 */
export declare function checkClockSkew(reqDate: Date, nowDate: Date, delay?: number, forward?: number): void;
export declare function validateRequestAndGetSignatureHeader(request: IncomingRequest, clock?: ClockSkewSettings): string;
/**
 * Parse the request headers
 * DraftとRFCをうまく区別してリクエストをパースする
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 * @param options
 */
export declare function parseRequest(request: IncomingRequest, options?: RequestParseOptions): import("./types.js").DraftParsedSignature;
