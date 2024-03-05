/// <reference types="node" />
import { ParsedDraftSignature } from "../types";
import { parseSignInfo } from "../shared/verify";
import type { webcrypto } from "node:crypto";
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
export declare function verifyDraftSignature(parsed: ParsedDraftSignature['value'], key: string | webcrypto.CryptoKey, errorLogger?: ((message: any) => any)): Promise<boolean>;
