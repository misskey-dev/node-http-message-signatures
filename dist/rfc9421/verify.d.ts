import { ParsedRFC9421Signature } from "../types.js";
import { parseSignInfo } from "../shared/verify.js";
/**
 * @deprecated Use `parseSignInfo`
 */
export declare const genSignInfoDraft: typeof parseSignInfo;
/**
 * Verify a draft signature
 * All provided algorithms are verified. If you want to limit the algorithms, use options when parsing the signature.
 * @param parsedEntries ParsedRFC9421Signature['value'] (`[label, (obj)][]`)
 * @param key public key
 * @param errorLogger: If you want to log errors, set function
 */
export declare function verifyRFC9421Signature(parsedEntries: ParsedRFC9421Signature['value'], key: string | CryptoKey, errorLogger?: (message: any) => any): Promise<boolean>;
