import { ParsedRFC9421Signature } from "../types.js";
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
 * All provided algorithms are verified. If you want to limit the algorithms, use options when parsing the signature.
 * @param parsedEntries ParsedRFC9421Signature['value'] (`[label, (obj)][]`)
 * @param key public key
 * @param errorLogger: If you want to log errors, set function
 */
export async function verifyRFC9421Signature(
	parsedEntries: ParsedRFC9421Signature['value'],
	key: string | CryptoKey,
	errorLogger?: (message: any) => any
): Promise<boolean> {
	for (const [label, parsed] of parsedEntries) {
		try {
			const { publicKey, algorithm } = await parseAndImportPublicKey(key, ['verify'], parsed.algorithm);
			const verify = await (await getWebcrypto()).subtle.verify(
				algorithm, publicKey, base64.parse(parsed.signature), textEncoder.encode(parsed.base)
			);
			if (verify === false) {
				if (errorLogger) errorLogger(`verification simply failed, label: ${label}`);
				return false;
			}
			if (verify !== true) throw new Error(verify); // unknown result
		} catch (e) {
			if (errorLogger) errorLogger(`Something happend in ${label}: ${e}`);
			return false;
		}
	}
	return true;
}
