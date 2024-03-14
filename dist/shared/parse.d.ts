import type { ClockSkewSettings, IncomingRequest, OutgoingResponse, ParsedSignature } from '../types.js';
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
    /**
     * Only used in RFC 9421.
     * If set to true, all algorithms are verified.
     * @default false
     */
    verifyAll?: boolean;
    /**
     * Specify sign algorithms you accept.
     *
     * If `verifyAll: false`, it is also used to choose the hash algorithm to verify.
     * (Younger index is preferred.)
     */
    algorithms?: {
        rfc9421?: string[];
    };
};
export declare class HTTPMessageSignaturesParseError extends Error {
    constructor(message: string);
}
export declare class SignatureHeaderNotFoundError extends HTTPMessageSignaturesParseError {
    constructor();
}
export declare class InvalidRequestError extends HTTPMessageSignaturesParseError {
    constructor(message: string);
}
export declare class RequestHasMultipleSignatureHeadersError extends HTTPMessageSignaturesParseError {
    constructor();
}
export declare class RequestHasMultipleDateHeadersError extends HTTPMessageSignaturesParseError {
    constructor();
}
export declare class ClockSkewInvalidError extends HTTPMessageSignaturesParseError {
    constructor(reqDate: Date, nowDate: Date);
}
export declare class UnknownSignatureHeaderFormatError extends HTTPMessageSignaturesParseError {
    constructor();
}
export declare class SignatureParamsContentLackedError extends HTTPMessageSignaturesParseError {
    constructor(lackedContent: string);
}
export declare class SignatureParamsClockInvalidError extends HTTPMessageSignaturesParseError {
    constructor(prop: 'created' | 'expires');
}
export declare class SignatureInputLackedError extends HTTPMessageSignaturesParseError {
    constructor(message: any);
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
 * @param delay Tolerance of request's clock delay (ms)
 * @param forward Tolerance of request's clock forwarding (ms)
 */
export declare function checkClockSkew(reqDate: Date, nowDate: Date, delay?: number, forward?: number): void;
/**
 * Check clock skew and get the signature and signature-input header
 */
export declare function validateRequestAndGetSignatureHeader(source: IncomingRequest | OutgoingResponse, clock?: ClockSkewSettings): {
    signatureHeader: string;
    signatureInput: string | null;
    headers: import("../types.js").HeadersLike;
};
/**
 * Parse request headers with Draft and RFC discrimination
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 * @param options
 */
export declare function parseRequestSignature(request: IncomingRequest, options?: RequestParseOptions): ParsedSignature;
