import { ParsedDraftSignature } from "../types";
import { parsePublicKey } from "../pem/spki";
import { parseSignInfo } from "../shared/verify";
import { decodeBase64ToUint8Array, genSignInfo } from "../utils";

/**
 * @deprecated Use `parseSignInfo`
 */
export const genSignInfoDraft = parseSignInfo;

/**
 * Verify a draft signature
 */
export async function verifyDraftSignature(parsed: ParsedDraftSignature['value'], publicKeyPem: string, errorLogger?: ((message: any) => any)) {
	try {
		const parsedSpki = parsePublicKey(publicKeyPem);
		const publicKey = await globalThis.crypto.subtle.importKey('spki', parsedSpki.der, genSignInfo(parsedSpki), false, ['verify']);

		const verify = await globalThis.crypto.subtle.verify(publicKey.algorithm, publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
