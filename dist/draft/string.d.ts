import { IncomingRequest } from "../types.js";
export declare function genDraftSigningString(source: IncomingRequest, includeHeaders: string[], additional?: {
    keyId: string;
    algorithm: string;
    created?: string;
    expires?: string;
    opaque?: string;
}): string;
