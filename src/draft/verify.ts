import { ParsedDraftSignature } from "../types";
import { parsePublicKey } from "../pem/spki";
import { parseSignInfo } from "../shared/verify";
import { decodeBase64ToUint8Array, genSignInfo, getWebcrypto } from "../utils";

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
		const publicKey = await (await getWebcrypto()).subtle.importKey('spki', parsedSpki.der, genSignInfo(parsedSpki), false, ['verify']);

		const verify = await (await getWebcrypto()).subtle.verify(publicKey.algorithm, publicKey, decodeBase64ToUint8Array(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
