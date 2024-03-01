import type { ParsedDraftSignature } from '../types.js';
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): boolean;
