import * as crypto from 'crypto';
import { getDraftAlgoString, prepareSignInfo } from '@/utils.js';
export function genDraftSigningString(request, includeHeaders) {
    request.headers = lcObjectKey(request.headers);
    const results = [];
    for (const key of includeHeaders.map(x => x.toLowerCase())) {
        if (key === '(request-target)') {
            results.push(`(request-target): ${request.method.toLowerCase()} ${new URL(request.url).pathname}`);
        }
        else {
            results.push(`${key}: ${request.headers[key]}`);
        }
    }
    return results.join('\n');
}
function lcObjectKey(src) {
    const dst = {};
    for (const key of Object.keys(src).filter(x => x !== '__proto__' && typeof src[x] === 'string'))
        dst[key.toLowerCase()] = src[key];
    return dst;
}
export function genDraftSignature(signingString, privateKey, hashAlgorithm) {
    const r = crypto.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
    return r.toString('base64');
}
export function genDraftAuthorizationHeader(includeHeaders, keyId, signature, hashAlgorithm = 'rsa-sha256') {
    return `Signature ${genDraftSignatureHeader(includeHeaders, keyId, signature, hashAlgorithm)}`;
}
export function genDraftSignatureHeader(includeHeaders, keyId, signature, algorithm) {
    return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}
export function signAsDraftToRequest(request, key, includeHeaders, opts = {}) {
    const hashAlgorithm = opts?.hashAlgorithm || 'sha256';
    const signInfo = prepareSignInfo(key.privateKeyPem, hashAlgorithm);
    const signingString = genDraftSigningString(request, includeHeaders);
    const signature = genDraftSignature(signingString, key.privateKeyPem, signInfo.hashAlg);
    const signatureHeader = genDraftSignatureHeader(includeHeaders, key.keyId, signature, getDraftAlgoString(signInfo));
    Object.assign(request.headers, {
        Signature: signatureHeader
    });
    return {
        signingString,
        signature,
        signatureHeader,
    };
}
