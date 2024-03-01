import { RequestParseOptions } from "../parse.js";
import type { ParsedDraftSignature, IncomingRequest } from '../types.js';
export declare const DraftSignatureHeaderKeys: readonly ["keyId", "algorithm", "created", "expires", "opaque", "headers", "signature"];
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
export declare function parseDraftRequestSignatureHeader(signatureHeader: string): DraftSignatureHeaderParsedRaw;
export declare function validateAndProcessParsedDraftSignatureHeader(parsed: DraftSignatureHeaderParsedRaw, options?: RequestParseOptions): DraftSignatureHeaderParsed;
export declare function parseDraftRequest(request: IncomingRequest, options?: RequestParseOptions): ParsedDraftSignature;
