import type { DraftParsedSignature } from '../types.js';
export declare function verifySignature(parsed: DraftParsedSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): boolean;
