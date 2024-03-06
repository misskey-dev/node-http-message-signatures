import { ParsedDraftSignature } from "../types";
import { importPublicKey } from "../pem/spki";
import { parseSignInfo } from "../shared/verify";
import { type SignInfoDefaults, decodeBase64ToUint8Array, defaultSignInfoDefaults, getWebcrypto, genAlgorithmForSignAndVerify } from "../utils";
import type { webcrypto } from "node:crypto";

/**
 * @deprecated Use `parseSignInfo`
 */
export const genSignInfoDraft = parseSignInfo;

/**
 * Verify a draft signature
 * @param parsed ParsedDraftSignature['value']
 * @param key public key
 * @param errorLogger: If you want to log errors, set function
 */
export async function verifyDraftSignature(parsed: ParsedDraftSignature['value'], key: string | webcrypto.CryptoKey, errorLogger?: ((message: any) => any)): Promise<boolean>
export async function verifyDraftSignature(parsed: ParsedDraftSignature['value'], key: string | webcrypto.CryptoKey, defaults: SignInfoDefaults, errorLogger?: (message: any) => any): Promise<boolean>
export async function verifyDraftSignature(
	parsed: ParsedDraftSignature['value'],
	key: string | webcrypto.CryptoKey,
	p3?: ((message: any) => any) | SignInfoDefaults,
	p4?: (message: any) => any
): Promise<boolean> {
	const errorLogger = p3 && typeof p3 === 'function' ? p3 : p4;
	const defaults = p3 && typeof p3 === 'object' ? p3 : defaultSignInfoDefaults;
	try {
		const publicKey = typeof key === 'string' ? await importPublicKey(key, ['verify']) : key;
		const verify = await (await getWebcrypto()).subtle.verify(genAlgorithmForSignAndVerify(publicKey.algorithm, defaults), publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		if (verify !== true) throw new Error(`verification simply failed, result: ${verify}`);
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
