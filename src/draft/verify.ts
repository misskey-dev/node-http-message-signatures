import { ParsedDraftSignature } from "../types";
import { importPublicKey } from "../pem/spki";
import { parseSignInfo } from "../shared/verify";
import { decodeBase64ToUint8Array, getWebcrypto } from "../utils";
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
export async function verifyDraftSignature(parsed: ParsedDraftSignature['value'], key: string | webcrypto.CryptoKey, errorLogger?: ((message: any) => any)) {
	try {
		const publicKey = typeof key === 'string' ? await importPublicKey(key, ['verify']) : key;
		const verify = await (await getWebcrypto()).subtle.verify(publicKey.algorithm, publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
