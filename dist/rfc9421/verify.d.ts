import { ParsedRFC9421Signature, RFC9421SignatureAlgorithm } from "../types.js";
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
export declare function verifyRFC9421Signature(parsedEntries: ParsedRFC9421Signature['value'], keys: string | CryptoKey | Map<string, string | CryptoKey>, options?: {
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
}, errorLogger?: (message: any) => any): Promise<boolean>;
