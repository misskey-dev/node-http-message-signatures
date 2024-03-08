import { ParsedDraftSignature } from "../types";
import { parseAndImportPublicKey } from "../pem/spki";
import { parseSignInfo } from "../shared/verify";
import { getWebcrypto } from "../utils";
import { base64 } from "rfc4648";

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
export async function verifyDraftSignature(
	parsed: ParsedDraftSignature['value'],
	key: string | CryptoKey,
	errorLogger?: (message: any) => any
): Promise<boolean> {
	try {
		const { publicKey, algorithm } = await parseAndImportPublicKey(key, ['verify'], parsed.algorithm);
		const verify = await (await getWebcrypto()).subtle.verify(algorithm, publicKey, base64.parse(parsed.params.signature), (new TextEncoder()).encode(parsed.signingString));
		if (verify !== true) throw new Error(`verification simply failed, result: ${verify}`);
		return verify;
	} catch (e) {
		if (errorLogger) errorLogger(e);
		return false;
	}
}
