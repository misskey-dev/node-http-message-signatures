import * as crypto from 'crypto';
/**
 * privateKeyPemからhashAlgorithmを推測する
 *   hashが指定されていない場合、RSAかECの場合はsha256を補完する
 *   ed25519, ed448の場合はhashAlgorithmは常にnull
 */
export function prepareSignInfo(privateKeyPem, hash = null) {
    const keyObject = crypto.createPrivateKey(privateKeyPem);
    if (keyObject.asymmetricKeyType === 'rsa') {
        const hashAlgo = hash || 'sha256';
        return {
            keyAlg: keyObject.asymmetricKeyType,
            hashAlg: hashAlgo,
        };
    }
    if (keyObject.asymmetricKeyType === 'ec') {
        const hashAlgo = hash || 'sha256';
        return {
            keyAlg: keyObject.asymmetricKeyType,
            hashAlg: hashAlgo,
        };
    }
    if (keyObject.asymmetricKeyType === 'ed25519') {
        return {
            keyAlg: keyObject.asymmetricKeyType,
            hashAlg: null,
        };
    }
    if (keyObject.asymmetricKeyType === 'ed448') {
        return {
            keyAlg: keyObject.asymmetricKeyType,
            hashAlg: null,
        };
    }
    throw new Error(`unsupported keyAlgorithm: ${keyObject.asymmetricKeyType}`);
}
export function getDraftAlgoString(signInfo) {
    if (signInfo.keyAlg === 'rsa') {
        return `rsa-${signInfo.hashAlg}`;
    }
    if (signInfo.keyAlg === 'ec') {
        return `ecdsa-${signInfo.hashAlg}`;
    }
    if (signInfo.keyAlg === 'ed25519') {
        return 'ed25519-sha512'; // TODO: -sha512付けたくないがjoyent(別実装)が認識しない
    }
    if (signInfo.keyAlg === 'ed448') {
        return 'ed448';
    }
    throw new Error(`unsupported keyAlgorithm`);
}
