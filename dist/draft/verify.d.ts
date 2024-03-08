import { ParsedDraftSignature } from "../types.js";
import { parseSignInfo } from "../shared/verify.js";
/**
 * @deprecated Use `parseSignInfo`
 */
export declare const genSignInfoDraft: typeof parseSignInfo;
/**
 * Verify a draft signature
 * @param parsed ParsedDraftSignature['value']
 * @param key public key
 * @param errorLogger: If you want to log errors, set function
 */
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], key: string | CryptoKey, errorLogger?: (message: any) => any): Promise<boolean>;
