// src/draft/sign.ts
import * as crypto3 from "node:crypto";

// src/utils.ts
import * as crypto2 from "node:crypto";
function prepareSignInfo(privateKeyPem, hash = null) {
  const keyObject = crypto2.createPrivateKey(privateKeyPem);
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
function lcObjectKey(src) {
  return Object.entries(src).reduce((dst, [key, value]) => {
    if (key === "__proto__")
      return dst;
    dst[key.toLowerCase()] = value;
    return dst;
  }, {});
}
function lcObjectGet(src, key) {
  key = key.toLowerCase();
  for (const [k, v] of Object.entries(src)) {
    if (k.toLowerCase() === key)
      return v;
  }
  return void 0;
}
function objectLcKeys(src) {
  return Object.keys(src).reduce((dst, key) => {
    if (key === "__proto__")
      return dst;
    dst.add(key.toLowerCase());
    return dst;
  }, /* @__PURE__ */ new Set());
}

// src/draft/sign.ts
function genDraftSigningString(request, includeHeaders, additional) {
  const headers = lcObjectKey(request.headers);
  const results = [];
  for (const key of includeHeaders.map((x) => x.toLowerCase())) {
    if (key === "(request-target)") {
      results.push(`(request-target): ${request.method.toLowerCase()} ${request.url.startsWith("/") ? request.url : new URL(request.url).pathname}`);
    } else if (key === "(keyid)") {
      results.push(`(keyid): ${additional?.keyId}`);
    } else if (key === "(algorithm)") {
      results.push(`(algorithm): ${additional?.algorithm}`);
    } else if (key === "(created)") {
      results.push(`(created): ${additional?.created}`);
    } else if (key === "(expires)") {
      results.push(`(expires): ${additional?.expires}`);
    } else if (key === "(opaque)") {
      results.push(`(opaque): ${additional?.opaque}`);
    } else {
      if (key === "date" && !headers["date"] && headers["x-date"]) {
        results.push(`date: ${headers["x-date"]}`);
      } else {
        results.push(`${key}: ${headers[key]}`);
      }
    }
  }
  return results.join("\n");
}
function genDraftSignature(signingString, privateKey, hashAlgorithm) {
  const r = crypto3.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
  return r.toString("base64");
}
function genDraftSignatureHeader(includeHeaders, keyId, signature, algorithm) {
  return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(" ")}",signature="${signature}"`;
}
function signAsDraftToRequest(request, key, includeHeaders, opts = {}) {
  const hashAlgorithm = opts?.hashAlgorithm || "sha256";
  const signInfo = prepareSignInfo(key.privateKeyPem, hashAlgorithm);
  const algoString = getDraftAlgoString(signInfo);
  const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });
  const signature = genDraftSignature(signingString, key.privateKeyPem, signInfo.hashAlg);
  const signatureHeader = genDraftSignatureHeader(includeHeaders, key.keyId, signature, algoString);
  Object.assign(request.headers, {
    Signature: signatureHeader
  });
  return {
    signingString,
    signature,
    signatureHeader
  };
}

// src/draft/parse.ts
var DraftSignatureHeaderKeys = ["keyId", "algorithm", "created", "expires", "opaque", "headers", "signature"];
function parseDraftRequestSignatureHeader(signatureHeader) {
  const result = {};
  let prevStatus = "none";
  let currentKey = "";
  let currentValue = "";
  const spaceRegex = /\s/;
  for (let i = 0; i < signatureHeader.length; i++) {
    const char = signatureHeader[i];
    if (prevStatus === "none") {
      if (char === ",")
        continue;
      if (spaceRegex.test(char))
        continue;
      prevStatus = "name";
      currentKey = char;
    } else if (prevStatus === "name") {
      if (char === "=") {
        prevStatus = "equal";
      } else {
        currentKey = `${currentKey}${char}`;
      }
    } else if (prevStatus === "equal") {
      if (char === '"') {
        prevStatus = "startQuote";
      } else {
        prevStatus = "valueWithoutQuote";
        currentValue = char;
      }
    } else if (prevStatus === "startQuote") {
      if (char === '"') {
        prevStatus = "endQuote";
        result[currentKey] = currentValue;
        currentKey = "";
        currentValue = "";
      } else {
        prevStatus = "value";
        currentValue = char;
      }
    } else if (prevStatus === "value") {
      if (char === '"') {
        prevStatus = "endQuote";
        result[currentKey] = currentValue;
        currentKey = "";
        currentValue = "";
      } else {
        currentValue = `${currentValue}${char}`;
      }
    } else if (prevStatus === "valueWithoutQuote") {
      if (char === ",") {
        prevStatus = "none";
        result[currentKey] = currentValue;
        currentKey = "";
        currentValue = "";
      }
    } else if (prevStatus === "endQuote") {
      prevStatus = "none";
    }
  }
  return result;
}
function validateAndProcessParsedDraftSignatureHeader(parsed, options) {
  if (!parsed.keyId)
    throw new DraftSignatureHeaderContentLackedError("keyId");
  if (!parsed.algorithm)
    throw new DraftSignatureHeaderContentLackedError("algorithm");
  if (!parsed.signature)
    throw new DraftSignatureHeaderContentLackedError("signature");
  if (!parsed.headers)
    throw new DraftSignatureHeaderContentLackedError("headers");
  const headersArray = parsed.headers.split(" ");
  if (options?.requiredInputs?.draft) {
    for (const requiredInput of options.requiredInputs.draft) {
      if (requiredInput === "x-date" || requiredInput === "date") {
        if (headersArray.includes("date"))
          continue;
        if (headersArray.includes("x-date"))
          continue;
        throw new DraftSignatureHeaderContentLackedError(`headers.${requiredInput}`);
      }
      if (!headersArray.includes(requiredInput))
        throw new DraftSignatureHeaderContentLackedError(`headers.${requiredInput}`);
    }
  }
  if (parsed.created) {
    const createdSec = parseInt(parsed.created);
    if (isNaN(createdSec))
      throw new DraftSignatureHeaderClockInvalidError("created");
    const nowTime = (options?.clockSkew?.now || /* @__PURE__ */ new Date()).getTime();
    if (createdSec * 1e3 > nowTime + (options?.clockSkew?.forward ?? 100)) {
      throw new DraftSignatureHeaderClockInvalidError("created");
    }
  }
  if (parsed.expires) {
    const expiresSec = parseInt(parsed.expires);
    if (isNaN(expiresSec))
      throw new DraftSignatureHeaderClockInvalidError("expires");
    const nowTime = (options?.clockSkew?.now || /* @__PURE__ */ new Date()).getTime();
    if (expiresSec * 1e3 < nowTime - (options?.clockSkew?.forward ?? 100)) {
      throw new DraftSignatureHeaderClockInvalidError("expires");
    }
  }
  return {
    keyId: parsed.keyId,
    algorithm: parsed.algorithm.toLowerCase(),
    signature: parsed.signature,
    headers: headersArray,
    created: parsed.created,
    expires: parsed.expires,
    opaque: parsed.opaque
  };
}
function parseDraftRequest(request, options) {
  const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
  const parsedSignatureHeader = validateAndProcessParsedDraftSignatureHeader(parseDraftRequestSignatureHeader(signatureHeader), options);
  const signingString = genDraftSigningString(
    request,
    parsedSignatureHeader.headers,
    {
      keyId: parsedSignatureHeader.keyId,
      algorithm: parsedSignatureHeader.algorithm,
      created: parsedSignatureHeader.created,
      expires: parsedSignatureHeader.expires,
      opaque: parsedSignatureHeader.opaque
    }
  );
  return {
    version: "draft",
    value: {
      scheme: "Signature",
      params: parsedSignatureHeader,
      signingString,
      algorithm: parsedSignatureHeader.algorithm.toUpperCase(),
      keyId: parsedSignatureHeader.keyId
    }
  };
}

// src/parse.ts
var HTTPMessageSignaturesParseError = class extends Error {
  constructor(message) {
    super(message);
  }
};
var SignatureHeaderNotFoundError = class extends HTTPMessageSignaturesParseError {
  constructor() {
    super("Signature header not found");
  }
};
var InvalidRequestError = class extends HTTPMessageSignaturesParseError {
  constructor(message) {
    super(message);
  }
};
var RequestHasMultipleSignatureHeadersError = class extends HTTPMessageSignaturesParseError {
  constructor() {
    super("Request has multiple signature headers");
  }
};
var RequestHasMultipleDateHeadersError = class extends HTTPMessageSignaturesParseError {
  constructor() {
    super("Request has multiple date headers");
  }
};
var ClockSkewInvalidError = class extends HTTPMessageSignaturesParseError {
  constructor(reqDate, nowDate) {
    super(`Clock skew is invalid: request="${reqDate.toJSON()}",now="${nowDate.toJSON()}",diff="${nowDate.getTime() - reqDate.getTime()}"`);
  }
};
var UnknownSignatureHeaderFormatError = class extends HTTPMessageSignaturesParseError {
  constructor() {
    super("Unknown signature header format");
  }
};
var DraftSignatureHeaderContentLackedError = class extends HTTPMessageSignaturesParseError {
  constructor(lackedContent) {
    super(`Signature header content lacked: ${lackedContent}`);
  }
};
var DraftSignatureHeaderClockInvalidError = class extends HTTPMessageSignaturesParseError {
  constructor(prop) {
    super(`Clock skew is invalid (${prop})`);
  }
};
function signatureHeaderIsDraft(signatureHeader) {
  return signatureHeader.includes('signature="');
}
function requestIsRFC9421(request) {
  return objectLcKeys(request.headers).has("signature-input");
}
function checkClockSkew(reqDate, nowDate, delay = 300 * 1e3, forward = 100) {
  const reqTime = reqDate.getTime();
  const nowTime = nowDate.getTime();
  if (reqTime > nowTime + forward)
    throw new ClockSkewInvalidError(reqDate, nowDate);
  if (reqTime < nowTime - delay)
    throw new ClockSkewInvalidError(reqDate, nowDate);
}
function validateRequestAndGetSignatureHeader(request, clock) {
  if (!request.headers)
    throw new SignatureHeaderNotFoundError();
  const headers = lcObjectKey(request.headers);
  if (headers["date"]) {
    if (Array.isArray(headers["date"]))
      throw new RequestHasMultipleDateHeadersError();
    checkClockSkew(new Date(headers["date"]), clock?.now || /* @__PURE__ */ new Date(), clock?.delay, clock?.forward);
  } else if (headers["x-date"]) {
    if (Array.isArray(headers["x-date"]))
      throw new RequestHasMultipleDateHeadersError();
    checkClockSkew(new Date(headers["x-date"]), clock?.now || /* @__PURE__ */ new Date(), clock?.delay, clock?.forward);
  }
  if (!request.method)
    throw new InvalidRequestError("Request method not found");
  if (!request.url)
    throw new InvalidRequestError("Request URL not found");
  const signatureHeader = headers["signature"];
  if (signatureHeader) {
    if (Array.isArray(signatureHeader))
      throw new RequestHasMultipleSignatureHeadersError();
    return signatureHeader;
  }
  const authorizationHeader = headers["authorization"];
  if (authorizationHeader) {
    if (authorizationHeader.startsWith("Signature "))
      return authorizationHeader.slice(10);
  }
  throw new SignatureHeaderNotFoundError();
}
function parseRequestSignature(request, options) {
  const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
  if (requestIsRFC9421(request)) {
    throw new Error("Not implemented");
  } else if (signatureHeaderIsDraft(signatureHeader)) {
    return parseDraftRequest(request, options);
  }
  throw new UnknownSignatureHeaderFormatError();
}

// src/keypair.ts
import * as crypto4 from "node:crypto";
import * as util from "node:util";
var generateKeyPair2 = util.promisify(crypto4.generateKeyPair);
async function genRsaKeyPair(modulusLength = 4096) {
  return await generateKeyPair2("rsa", {
    modulusLength,
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: void 0,
      passphrase: void 0
    }
  });
}
async function genEcKeyPair(namedCurve = "prime256v1") {
  return await generateKeyPair2("ec", {
    namedCurve,
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: void 0,
      passphrase: void 0
    }
  });
}
async function genEd25519KeyPair() {
  return await generateKeyPair2("ed25519", {
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: void 0,
      passphrase: void 0
    }
  });
}
async function genEd448KeyPair() {
  return await generateKeyPair2("ed448", {
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: void 0,
      passphrase: void 0
    }
  });
}
function toSpkiPublicKey(publicKey) {
  return crypto4.createPublicKey(publicKey).export({
    type: "spki",
    format: "pem"
  });
}

// src/digest/utils.ts
import { createHash } from "node:crypto";
function createBase64Digest(body, hash = "sha256") {
  if (Array.isArray(hash)) {
    return new Map(hash.map((h) => [h, createBase64Digest(body, h)]));
  }
  return createHash(hash).update(body).digest("base64");
}

// src/digest/digest-rfc3230.ts
var digestHashAlgosForEncoding = {
  "sha1": "SHA",
  "sha256": "SHA-256",
  "sha384": "SHA-384",
  "sha512": "SHA-512",
  "md5": "MD5"
};
var digestHashAlgosForDecoding = {
  "SHA": "sha1",
  "SHA-1": "sha1",
  "SHA-256": "sha256",
  "SHA-384": "sha384",
  "SHA-512": "sha512",
  "MD5": "md5"
};
function genRFC3230DigestHeader(body, hashAlgorithm = "sha256") {
  return `${digestHashAlgosForEncoding[hashAlgorithm]}=${createBase64Digest(body, hashAlgorithm)}`;
}
var digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;
function verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest = true, errorLogger) {
  let digestHeader = lcObjectGet(request.headers, "digest");
  if (!digestHeader) {
    if (failOnNoDigest) {
      if (errorLogger)
        errorLogger("Digest header not found");
      return false;
    }
    return true;
  }
  if (Array.isArray(digestHeader)) {
    digestHeader = digestHeader[0];
  }
  const match = digestHeader.match(digestHeaderRegEx);
  if (!match) {
    if (errorLogger)
      errorLogger("Invalid Digest header format");
    return false;
  }
  const value = match[2];
  if (!value) {
    if (errorLogger)
      errorLogger("Invalid Digest header format");
    return false;
  }
  const algo = digestHashAlgosForDecoding[match[1].toUpperCase()];
  if (!algo) {
    if (errorLogger)
      errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
    return false;
  }
  const hash = createBase64Digest(rawBody, algo);
  if (hash !== value) {
    if (errorLogger)
      errorLogger(`Digest header hash mismatch`);
    return false;
  }
  return true;
}

// src/digest/digest.ts
function verifyDigestHeader(request, rawBody, failOnNoDigest = true, errorLogger) {
  const headerKeys = objectLcKeys(request.headers);
  if (headerKeys.has("content-digest")) {
    throw new Error("Not implemented yet");
  } else if (headerKeys.has("digest")) {
    return verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest, errorLogger);
  }
  if (failOnNoDigest) {
    if (errorLogger)
      errorLogger("Content-Digest or Digest header not found");
    return false;
  }
  return true;
}

// src/shared/verify.ts
function buildErrorMessage(providedAlgorithm, detectedAlgorithm, realKeyType) {
  return `Provided algorithm does not match the public key type: provided=${detectedAlgorithm}(${providedAlgorithm}}, real=${realKeyType}`;
}
function detectAndVerifyAlgorithm(algorithm, publicKey, errorLogger) {
  algorithm = algorithm?.toLowerCase();
  const realKeyType = publicKey.asymmetricKeyType;
  if (algorithm && algorithm !== "hs2019" && realKeyType) {
    const providedKeyAlgorithm = algorithm.split("-")[0];
    if (providedKeyAlgorithm !== realKeyType.toLowerCase() && !(providedKeyAlgorithm === "ecdsa" && realKeyType === "ec")) {
      if (errorLogger)
        errorLogger(buildErrorMessage(providedKeyAlgorithm, realKeyType, realKeyType));
      return null;
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
  if (errorLogger)
    errorLogger("Algorithm is not detected");
  return null;
}

// src/draft/verify.ts
import * as ncrypto from "node:crypto";

// src/shared/spki-algo.ts
import ASN1 from "@lapo/asn1js";
import Hex from "@lapo/asn1js/hex.js";
import Base64 from "@lapo/asn1js/base64.js";
var SpkiParseError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function getPublicKeyAlgorithmNameFromOid(oidStr) {
  const oid = oidStr.split("\n")[0].trim();
  if (oid === "1.2.840.113549.1.1.1")
    return "RSASSA-PKCS1-v1_5";
  if (oid === "1.2.840.10040.4.1")
    return "DSA";
  if (oid === "1.2.840.10046.2.1")
    return "DH";
  if (oid === "2.16.840.1.101.2.1.1.22")
    return "KEA";
  if (oid === "1.2.840.10045.2.1")
    return "EC";
  if (oid === "1.3.101.112")
    return "Ed25519";
  if (oid === "1.3.101.113")
    return "Ed448";
  throw new SpkiParseError("Unknown Public Key Algorithm OID");
}
function getNistCurveFromOid(oidStr) {
  const oid = oidStr.split("\n")[0].trim();
  if (oid === "1.2.840.10045.3.1.1")
    return "P-192";
  if (oid === "1.3.132.0.33")
    return "P-224";
  if (oid === "1.2.840.10045.3.1.7")
    return "P-256";
  if (oid === "1.3.132.0.34")
    return "P-384";
  if (oid === "1.3.132.0.35")
    return "P-521";
  throw new SpkiParseError("Unknown Named Curve OID");
}
function asn1BinaryToArrayBuffer(enc) {
  if (typeof enc === "string") {
    return Uint8Array.from(enc, (s) => s.charCodeAt(0)).buffer;
  }
  if (enc instanceof ArrayBuffer) {
    return enc;
  } else if (enc instanceof Uint8Array) {
    return enc.buffer;
  } else if (Array.isArray(enc)) {
    return new Uint8Array(enc).buffer;
  }
  throw new SpkiParseError("Invalid SPKI (invalid ASN1 Stream data)");
}
var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
function parseSpki(input) {
  const der = typeof input === "string" ? reHex.test(input) ? Hex.decode(input) : Base64.unarmor(input) : input;
  const parsed = ASN1.decode(der);
  if (!parsed.sub || parsed.sub.length === 0 || parsed.sub.length > 2)
    throw new SpkiParseError("Invalid SPKI (invalid sub)");
  const algorithmIdentifierSub = parsed.sub && parsed.sub[0] && parsed.sub[0].sub;
  if (!algorithmIdentifierSub)
    throw new SpkiParseError("Invalid SPKI (no AlgorithmIdentifier)");
  if (algorithmIdentifierSub.length === 0)
    throw new SpkiParseError("Invalid SPKI (invalid AlgorithmIdentifier sub length, zero)");
  if (algorithmIdentifierSub.length > 2)
    throw new SpkiParseError("Invalid SPKI (invalid AlgorithmIdentifier sub length, too many)");
  if (algorithmIdentifierSub[0].tag.tagNumber !== 6)
    throw new SpkiParseError("Invalid SPKI (invalid AlgorithmIdentifier.sub[0] type)");
  const algorithm = algorithmIdentifierSub[0]?.content() ?? null;
  if (typeof algorithm !== "string")
    throw new SpkiParseError("Invalid SPKI (invalid algorithm content)");
  const parameter = algorithmIdentifierSub[1]?.content() ?? null;
  return {
    der: asn1BinaryToArrayBuffer(parsed.stream.enc),
    algorithm,
    parameter
  };
}
function genKeyImportParams(parsed, defaults = {
  hash: "SHA-256",
  ec: "DSA"
}) {
  const algorithm = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);
  if (!algorithm)
    throw new SpkiParseError("Unknown algorithm");
  if (algorithm === "RSASSA-PKCS1-v1_5") {
    return { name: "RSASSA-PKCS1-v1_5", hash: defaults.hash };
  }
  if (algorithm === "EC") {
    if (typeof parsed.parameter !== "string")
      throw new SpkiParseError("Invalid EC parameter");
    return {
      name: `EC${defaults.ec}`,
      namedCurve: getNistCurveFromOid(parsed.parameter)
    };
  }
  if (algorithm === "Ed25519") {
    return { name: "Ed25519" };
  }
  if (algorithm === "Ed448") {
    return { name: "Ed448" };
  }
  throw new SpkiParseError("Unknown algorithm");
}
function genVerifyAlgorithm(parsed, defaults = {
  hash: "SHA-256",
  ec: "DSA"
}) {
  const algorithm = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);
  if (!algorithm)
    throw new SpkiParseError("Unknown algorithm");
  if (algorithm === "RSASSA-PKCS1-v1_5") {
    return { name: "RSASSA-PKCS1-v1_5" };
  }
  if (algorithm === "EC") {
    return {
      name: `EC${defaults.ec}`,
      hash: defaults.hash
    };
  }
  if (algorithm === "Ed25519") {
    return { name: "Ed25519" };
  }
  if (algorithm === "Ed448") {
    return {
      name: "Ed448",
      context: void 0
      // TODO?
    };
  }
  throw new SpkiParseError("Unknown algorithm");
}

// src/draft/verify.ts
function verifyDraftSignature(parsed, publicKeyPem, errorLogger) {
  const publicKey = ncrypto.createPublicKey(publicKeyPem);
  try {
    const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
    if (!detected)
      return false;
    return ncrypto.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, "base64"));
  } catch (e) {
    if (errorLogger)
      errorLogger(e);
    return false;
  }
}
var encoder = new TextEncoder();
async function webVerifyDraftSignature(parsed, publicKeyPem, errorLogger) {
  try {
    const parsedSpki = parseSpki(publicKeyPem);
    const publicKey = await crypto.subtle.importKey("spki", parsedSpki.der, genKeyImportParams(parsedSpki), false, ["verify"]);
    const verify2 = await crypto.subtle.verify(genVerifyAlgorithm(parsedSpki), publicKey, encoder.encode(parsed.params.signature), encoder.encode(parsed.signingString));
    return verify2;
  } catch (e) {
    if (errorLogger)
      errorLogger(e);
    return false;
  }
}
export {
  ClockSkewInvalidError,
  DraftSignatureHeaderClockInvalidError,
  DraftSignatureHeaderContentLackedError,
  DraftSignatureHeaderKeys,
  HTTPMessageSignaturesParseError,
  InvalidRequestError,
  RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError,
  SignatureHeaderNotFoundError,
  UnknownSignatureHeaderFormatError,
  checkClockSkew,
  detectAndVerifyAlgorithm,
  digestHeaderRegEx,
  genDraftSignature,
  genDraftSignatureHeader,
  genDraftSigningString,
  genEcKeyPair,
  genEd25519KeyPair,
  genEd448KeyPair,
  genRFC3230DigestHeader,
  genRsaKeyPair,
  getDraftAlgoString,
  lcObjectGet,
  lcObjectKey,
  objectLcKeys,
  parseDraftRequest,
  parseDraftRequestSignatureHeader,
  parseRequestSignature,
  prepareSignInfo,
  requestIsRFC9421,
  signAsDraftToRequest,
  signatureHeaderIsDraft,
  toSpkiPublicKey,
  validateAndProcessParsedDraftSignatureHeader,
  validateRequestAndGetSignatureHeader,
  verifyDigestHeader,
  verifyDraftSignature,
  verifyRFC3230DigestHeader,
  webVerifyDraftSignature
};
