import { RequestParseOptions } from "../parse.js";
import type { DraftParsedSignature, IncomingRequest } from '../types.js';
export declare class SignatureHeaderContentLackedError extends Error {
    constructor(lackedContent: string);
}
export declare function parseDraftRequestSignatureHeader(signatureHeader: string): Record<string, string>;
export declare function parseDraftRequest(request: IncomingRequest, options?: RequestParseOptions): DraftParsedSignature;
