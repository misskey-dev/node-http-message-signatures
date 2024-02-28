import { detectAndVerifyAlgorithm } from '@/shared/verify.js';
import * as crypto from 'crypto';
export function verifySignature(parsed, publicKeyPem) {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
    return crypto.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, 'base64'));
}
