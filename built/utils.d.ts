import { SignInfo, SignatureHashAlgorithm } from "@/types.js";
/**
 * privateKeyPemからhashAlgorithmを推測する
 *   hashが指定されていない場合、RSAかECの場合はsha256を補完する
 *   ed25519, ed448の場合はhashAlgorithmは常にnull
 */
export declare function prepareSignInfo(privateKeyPem: string, hash?: SignatureHashAlgorithm): SignInfo;
export declare function getDraftAlgoString(signInfo: SignInfo): string;
