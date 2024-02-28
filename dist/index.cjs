'use strict';

const crypto = require('crypto');

function _interopNamespaceCompat(e) {
	if (e && typeof e === 'object' && 'default' in e) return e;
	const n = Object.create(null);
	if (e) {
		for (const k in e) {
			n[k] = e[k];
		}
	}
	n.default = e;
	return n;
}

const crypto__namespace = /*#__PURE__*/_interopNamespaceCompat(crypto);

function prepareSignInfo(privateKeyPem, hash = null) {
  const keyObject = crypto__namespace.createPrivateKey(privateKeyPem);
  if (keyObject.asymmetricKeyType === "rsa") {
    const hashAlgo = hash || "sha256";
    return {
      keyAlg: keyObject.asymmetricKeyType,
      hashAlg: hashAlgo
    };
  }
  if (keyObject.asymmetricKeyType === "ec") {
    const hashAlgo = hash || "sha256";
    return {
      keyAlg: keyObject.asymmetricKeyType,
      hashAlg: hashAlgo
    };
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    return {
      keyAlg: keyObject.asymmetricKeyType,
      hashAlg: null
    };
  }
  if (keyObject.asymmetricKeyType === "ed448") {
    return {
      keyAlg: keyObject.asymmetricKeyType,
      hashAlg: null
    };
  }
  throw new Error(`unsupported keyAlgorithm: ${keyObject.asymmetricKeyType}`);
}
function getDraftAlgoString(signInfo) {
  if (signInfo.keyAlg === "rsa") {
    return `rsa-${signInfo.hashAlg}`;
  }
  if (signInfo.keyAlg === "ec") {
    return `ecdsa-${signInfo.hashAlg}`;
  }
  if (signInfo.keyAlg === "ed25519") {
    return "ed25519-sha512";
  }
  if (signInfo.keyAlg === "ed448") {
    return "ed448";
  }
  throw new Error(`unsupported keyAlgorithm`);
}

function genDraftSigningString(request, includeHeaders) {
  request.headers = lcObjectKey(request.headers);
  const results = [];
  for (const key of includeHeaders.map((x) => x.toLowerCase())) {
    if (key === "(request-target)") {
      results.push(`(request-target): ${request.method.toLowerCase()} ${new URL(request.url).pathname}`);
    } else {
      results.push(`${key}: ${request.headers[key]}`);
    }
  }
  return results.join("\n");
}
function lcObjectKey(src) {
  const dst = {};
  for (const key of Object.keys(src).filter((x) => x !== "__proto__" && typeof src[x] === "string"))
    dst[key.toLowerCase()] = src[key];
  return dst;
}
function genDraftSignature(signingString, privateKey, hashAlgorithm) {
  const r = crypto__namespace.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
  return r.toString("base64");
}
function genDraftAuthorizationHeader(includeHeaders, keyId, signature, hashAlgorithm = "rsa-sha256") {
  return `Signature ${genDraftSignatureHeader(includeHeaders, keyId, signature, hashAlgorithm)}`;
}
function genDraftSignatureHeader(includeHeaders, keyId, signature, algorithm) {
  return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(" ")}",signature="${signature}"`;
}
function signAsDraftToRequest(request, key, includeHeaders, opts = {}) {
  const hashAlgorithm = opts?.hashAlgorithm || "sha256";
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
    signatureHeader
  };
}

function detectAndVerifyAlgorithm(algorithm, publicKey) {
  algorithm = algorithm?.toLowerCase();
  const realKeyType = publicKey.asymmetricKeyType;
  if (algorithm && algorithm !== "hs2019" && realKeyType) {
    const providedKeyAlgorithm = algorithm.split("-")[0];
    if (providedKeyAlgorithm[0] !== realKeyType.toLowerCase() && !(providedKeyAlgorithm === "ecdsa" && realKeyType === "ec")) {
      throw new Error("Provided algorithm does not match the public key type");
    }
  }
  if (algorithm === "ed25519" || algorithm === "ed25519-sha512" || realKeyType === "ed25519") {
    return { keyAlg: "ed25519", hashAlg: null };
  }
  if (algorithm === "ed448" || realKeyType === "ed448") {
    return { keyAlg: "ed448", hashAlg: null };
  }
  if (algorithm === "rsa-v1_5-sha256")
    return { keyAlg: "rsa", hashAlg: "sha256" };
  if (algorithm === "ecdsa-p256-sha256")
    return { keyAlg: "ec", hashAlg: "sha256" };
  if (algorithm === "ecdsa-p384-sha384")
    return { keyAlg: "ec", hashAlg: "sha384" };
  const m = algorithm?.match(/^(rsa|ecdsa)-(sha(?:256|384|512))$/);
  if (m) {
    return {
      keyAlg: m[1] === "ecdsa" ? "ec" : "rsa",
      hashAlg: m[2]
    };
  }
  if (realKeyType === "rsa" || realKeyType === "ec") {
    return { keyAlg: realKeyType, hashAlg: "sha256" };
  } else if (realKeyType) {
    return { keyAlg: realKeyType, hashAlg: null };
  } else if (algorithm && algorithm !== "hs2019") {
    const algoSplitted = algorithm.split("-");
    return {
      keyAlg: algoSplitted[0],
      hashAlg: algoSplitted.length === 1 ? null : algoSplitted[algoSplitted.length - 1]
    };
  }
  throw new Error("Algorithm not found");
}

function verifySignature(parsed, publicKeyPem) {
  const publicKey = crypto__namespace.createPublicKey(publicKeyPem);
  const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
  return crypto__namespace.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, "base64"));
}

exports.genDraftAuthorizationHeader = genDraftAuthorizationHeader;
exports.genDraftSignature = genDraftSignature;
exports.genDraftSignatureHeader = genDraftSignatureHeader;
exports.genDraftSigningString = genDraftSigningString;
exports.signAsDraftToRequest = signAsDraftToRequest;
exports.verifySignature = verifySignature;
