import { ParsedDraftSignature } from "../types.js";
import { parseAndImportPublicKey } from "../pem/spki.js";
import { parseSignInfo } from "../shared/verify.js";
import { getWebcrypto } from "../utils.js";
import { base64 } from "rfc4648";
import { textEncoder } from "../const.js";

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
		const verify = await (await getWebcrypto()).subtle.verify(
			algorithm, publicKey, base64.parse(parsed.params.signature), textEncoder.encode(parsed.signingString)
		);
		if (verify === true) return true;
		if (verify === false) {
			if (errorLogger) errorLogger(`verification simply failed`);
			return false;
		}
		if (verify !== true) throw new Error(verify); // unknown result
	} catch (e) {
		if (errorLogger) errorLogger(e);
	}
	return false;
}
