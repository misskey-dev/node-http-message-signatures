import type { ParsedDraftSignature } from '../types.js';
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): boolean;
/**
 * Experimental
 * @experimental Testing Web Crypto API
 */
export declare function webVerifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): Promise<boolean>;
