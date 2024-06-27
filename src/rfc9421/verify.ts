import { ParsedRFC9421Signature, ParsedRFC9421SignatureValueWithBase, RFC9421SignatureAlgorithm } from "../types.js";
import { parseAndImportPublicKey } from "../pem/spki.js";
import { parseSignInfo } from "../shared/verify.js";
import { getWebcrypto } from "../utils.js";
import { base64 } from "rfc4648";
import { textEncoder } from "../const.js";

/**
 * @deprecated Use `parseSignInfo`
 */
export const genSignInfoDraft = parseSignInfo;

const algorithmsDefault = ['ed25519', 'rsa-pss-sha512', 'ecdsa-p384-sha384', 'ecdsa-p256-sha256', 'hmac-sha256', 'rsa-v1_5-sha256'] satisfies RFC9421SignatureAlgorithm[];

/**
 * Verify a draft signature
 * All provided algorithms are verified. If you want to limit the algorithms, use options when parsing the signature.
 * @param parsedEntries ParsedRFC9421Signature['value'] (`[label, (obj)][]`)
 * @param keys a public key or Map of public keys
 * 		* If you want to verify multiple signatures, you need to use Map as the keys
 * 		* You can use keyid and label as the key of the Map
 * @param options: Options for multiple signatures verification
 * @param errorLogger: If you want to log errors, set function
 */
export async function verifyRFC9421Signature(
	parsedEntries: ParsedRFC9421Signature['value'],
	keys: string | CryptoKey | Map<string, string | CryptoKey>,
	options: {
		/**
		 * If you want all signatures to be verified, set true
		 */
		verifyAll: boolean;
		/**
		 * Specify signature algorithms you accept. (RFC 9421 algorithm registries)
		 *
		 * If `verifyAll: false`, it is also used to choose the hash algorithm to verify.
		 * (Younger index is preferred.)
		 */
		algorithms?: RFC9421SignatureAlgorithm[];
	} = {
		verifyAll: false,
		algorithms: algorithmsDefault,
	},
	errorLogger?: (message: any) => any
): Promise<boolean> {
	if (parsedEntries.length === 0) throw new Error('parsedEntries is empty');
	if (options.verifyAll === true && !(keys instanceof Map) && parsedEntries.length > 1) {
		throw new Error('If you want to verify multiple signatures, you need to use Map as the keys');
	}

	const algorithms = options?.algorithms?.map(x => x.toLowerCase()) ?? algorithmsDefault;
	if (algorithms.length === 0) throw new Error('algorithms is empty');

	const toVerify = [] as [string, ParsedRFC9421SignatureValueWithBase, string | CryptoKey][];
	let importedKeys: Awaited<ReturnType<typeof parseAndImportPublicKey>>[] = [];

	for (const [label, parsed] of parsedEntries) {
		const alg = parsed.algorithm?.toLowerCase();
		if (alg && !algorithms.includes(alg as RFC9421SignatureAlgorithm)) {
			continue;
		}

		if (!(keys instanceof Map)) {
			toVerify.push([label, parsed, keys]);
			continue;
		}

		const keyByName = keys instanceof Map ?
			(keys.get(label) ?? (parsed.keyid && keys.get(parsed.keyid)))
			: keys;
		if (keyByName) {
			toVerify.push([label, parsed, keyByName]);
			continue;
		}

		if (parsed.keyid && options.verifyAll === true) {
			// verifyAllの場合、keyidで見つからないときはエラーにする
			// If verifyAll is true, an error will be thrown if the keyid is not found.
			if (errorLogger) errorLogger(`key not found in provided keys (verifyAll: true), label: ${label} keyid: ${parsed.keyid}`);
			return false;
		}

		if (!alg) {
			if (errorLogger) errorLogger(`key not found by label or keyid, but algorithm also not found. label: ${label}`);
			return false;
		}

		if (importedKeys.length === 0) {
			importedKeys = await Promise.all(
				Array.from(keys.values())
					.map(key => parseAndImportPublicKey(key, ['verify'], parsed.algorithm))
			);
		}

		const keyByAlgorithm = importedKeys.find(({ algorithm }) => {
			try {
				parseSignInfo(alg, algorithm);
				return true;
			} catch (e) {
				return false;
			}
		});

		if (keyByAlgorithm) {
			toVerify.push([label, parsed, keyByAlgorithm.publicKey]);
			continue;
		}

		if (options.verifyAll === true) {
			if (errorLogger) errorLogger(`key not found, label: ${label}, keyid: ${parsed.keyid}`);
			return false;
		}
	}

	if (toVerify.length === 0) {
		if (errorLogger) errorLogger('No matched signature found');
		return false;
	}

	for (const [label, parsed, key] of toVerify) {
		try {
			const { publicKey, algorithm } = await parseAndImportPublicKey(key, ['verify'], parsed.algorithm);

			const verify = await (await getWebcrypto()).subtle.verify(
				algorithm, publicKey, base64.parse(parsed.signature), textEncoder.encode(parsed.base)
			);

			if (options.verifyAll === true) {
				if (verify === true) continue;
				if (verify === false) {
					if (errorLogger) errorLogger(`verification simply failed, label: ${label}`);
					return false;
				}
			} else {
				if (verify === true) return true;
				if (verify === false) {
					if (errorLogger) errorLogger(`verification simply failed, label: ${label}`);
					continue;
				}
			}
			if (typeof verify !== 'boolean') throw new Error(verify); // unknown result
		} catch (e) {
			if (errorLogger) errorLogger(`Something happend in ${label}: ${e}`);
			return false;
		}
	}

	// If verifyAll is true, all signatures have been verified
	// If verifyAll is false, no signature has been verified
	return options.verifyAll === true ? true : false;
}
