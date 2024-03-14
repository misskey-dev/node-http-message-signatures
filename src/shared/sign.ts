import { textEncoder } from "../const";
import { SignInfoDefaults, defaultSignInfoDefaults, encodeArrayBufferToBase64, genAlgorithmForSignAndVerify, getWebcrypto } from "../utils";

export async function genSignature(privateKey: CryptoKey, signingString: string, defaults: SignInfoDefaults = defaultSignInfoDefaults) {
	const signatureAB = await (await getWebcrypto()).subtle.sign(genAlgorithmForSignAndVerify(privateKey.algorithm, defaults.hash), privateKey, textEncoder.encode(signingString));
	return encodeArrayBufferToBase64(signatureAB);
}
