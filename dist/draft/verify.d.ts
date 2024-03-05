import { ParsedDraftSignature } from "../types";
import { parseSignInfo } from "../shared/verify";
/**
 * @deprecated Use `parseSignInfo`
 */
export declare const genSignInfoDraft: typeof parseSignInfo;
/**
 * Verify a draft signature
 */
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)): Promise<boolean>;
