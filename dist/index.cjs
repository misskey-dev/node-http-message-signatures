"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ClockSkewInvalidError: () => ClockSkewInvalidError,
  DraftSignatureHeaderKeys: () => DraftSignatureHeaderKeys,
  InvalidRequestError: () => InvalidRequestError,
  RequestHasMultipleDateHeadersError: () => RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError: () => RequestHasMultipleSignatureHeadersError,
  SignatureHeaderClockInvalidError: () => SignatureHeaderClockInvalidError,
  SignatureHeaderContentLackedError: () => SignatureHeaderContentLackedError,
  SignatureHeaderNotFoundError: () => SignatureHeaderNotFoundError,
  SignatureMissmatchWithProvidedAlgorithmError: () => SignatureMissmatchWithProvidedAlgorithmError,
  checkClockSkew: () => checkClockSkew,
  detectAndVerifyAlgorithm: () => detectAndVerifyAlgorithm,
  digestHeaderRegEx: () => digestHeaderRegEx,
  genDraftAuthorizationHeader: () => genDraftAuthorizationHeader,
  genDraftSignature: () => genDraftSignature,
  genDraftSignatureHeader: () => genDraftSignatureHeader,
  genDraftSigningString: () => genDraftSigningString,
  genEcKeyPair: () => genEcKeyPair,
  genEd25519KeyPair: () => genEd25519KeyPair,
  genEd448KeyPair: () => genEd448KeyPair,
  genRFC3230DigestHeader: () => genRFC3230DigestHeader,
  genRsaKeyPair: () => genRsaKeyPair,
  getDraftAlgoString: () => getDraftAlgoString,
  lcObjectGet: () => lcObjectGet,
  lcObjectKey: () => lcObjectKey,
  objectLcKeys: () => objectLcKeys,
  parseDraftRequest: () => parseDraftRequest,
  parseDraftRequestSignatureHeader: () => parseDraftRequestSignatureHeader,
  parseRequestSignature: () => parseRequestSignature,
  prepareSignInfo: () => prepareSignInfo,
  requestIsRFC9421: () => requestIsRFC9421,
  signAsDraftToRequest: () => signAsDraftToRequest,
  signatureHeaderIsDraft: () => signatureHeaderIsDraft,
  toSpkiPublicKey: () => toSpkiPublicKey,
  validateAndProcessParsedDraftSignatureHeader: () => validateAndProcessParsedDraftSignatureHeader,
  validateRequestAndGetSignatureHeader: () => validateRequestAndGetSignatureHeader,
  verifyDigestHeader: () => verifyDigestHeader,
  verifyDraftSignature: () => verifyDraftSignature,
  verifyRFC3230DigestHeader: () => verifyRFC3230DigestHeader
});
module.exports = __toCommonJS(src_exports);

// src/draft/sign.ts
var crypto2 = __toESM(require("node:crypto"), 1);

// src/utils.ts
var crypto = __toESM(require("node:crypto"), 1);
function prepareSignInfo(privateKeyPem, hash = null) {
  const keyObject = crypto.createPrivateKey(privateKeyPem);
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
  const r = crypto2.sign(hashAlgorithm, Buffer.from(signingString), privateKey);
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
var SignatureHeaderContentLackedError = class extends Error {
  constructor(lackedContent) {
    super(`Signature header content lacked: ${lackedContent}`);
  }
};
var SignatureHeaderClockInvalidError = class extends Error {
  constructor(prop) {
    super(`Clock skew is invalid (${prop})`);
  }
};
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
    throw new SignatureHeaderContentLackedError("keyId");
  if (!parsed.algorithm)
    throw new SignatureHeaderContentLackedError("algorithm");
  if (!parsed.signature)
    throw new SignatureHeaderContentLackedError("signature");
  if (!parsed.headers)
    throw new SignatureHeaderContentLackedError("headers");
  const headersArray = parsed.headers.split(" ");
  if (options?.requiredInputs?.draft) {
    for (const requiredInput of options.requiredInputs.draft) {
      if (requiredInput === "x-date" || requiredInput === "date") {
        if (headersArray.includes("date"))
          continue;
        if (headersArray.includes("x-date"))
          continue;
        throw new SignatureHeaderContentLackedError(`headers.${requiredInput}`);
      }
      if (!headersArray.includes(requiredInput))
        throw new SignatureHeaderContentLackedError(`headers.${requiredInput}`);
    }
  }
  if (parsed.created) {
    const createdSec = parseInt(parsed.created);
    if (isNaN(createdSec))
      throw new SignatureHeaderClockInvalidError("created");
    const nowTime = (options?.clockSkew?.now || /* @__PURE__ */ new Date()).getTime();
    if (createdSec * 1e3 > nowTime + (options?.clockSkew?.forward ?? 100)) {
      throw new SignatureHeaderClockInvalidError("created");
    }
  }
  if (parsed.expires) {
    const expiresSec = parseInt(parsed.expires);
    if (isNaN(expiresSec))
      throw new SignatureHeaderClockInvalidError("expires");
    const nowTime = (options?.clockSkew?.now || /* @__PURE__ */ new Date()).getTime();
    if (expiresSec * 1e3 < nowTime - (options?.clockSkew?.forward ?? 100)) {
      throw new SignatureHeaderClockInvalidError("expires");
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
var SignatureHeaderNotFoundError = class extends Error {
  constructor() {
    super("Signature header not found");
  }
};
var InvalidRequestError = class extends Error {
  constructor(message) {
    super(message);
  }
};
var RequestHasMultipleSignatureHeadersError = class extends Error {
  constructor() {
    super("Request has multiple signature headers");
  }
};
var RequestHasMultipleDateHeadersError = class extends Error {
  constructor() {
    super("Request has multiple date headers");
  }
};
var ClockSkewInvalidError = class extends Error {
  constructor(reqDate, nowDate) {
    super(`Clock skew is invalid: request="${reqDate.toJSON()}",now="${nowDate.toJSON()}",diff="${nowDate.getTime() - reqDate.getTime()}"`);
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
  const signatureHeader = headers["signature"];
  if (!signatureHeader)
    throw new SignatureHeaderNotFoundError();
  if (Array.isArray(signatureHeader))
    throw new RequestHasMultipleSignatureHeadersError();
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
  return signatureHeader;
}
function parseRequestSignature(request, options) {
  const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
  if (requestIsRFC9421(request)) {
    throw new Error("Not implemented");
  } else if (signatureHeaderIsDraft(signatureHeader)) {
    return parseDraftRequest(request, options);
  }
  return null;
}

// src/keypair.ts
var crypto3 = __toESM(require("node:crypto"), 1);
var util = __toESM(require("node:util"), 1);
var generateKeyPair2 = util.promisify(crypto3.generateKeyPair);
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
  return crypto3.createPublicKey(publicKey).export({
    type: "spki",
    format: "pem"
  });
}

// src/digest/utils.ts
var import_node_crypto = require("node:crypto");
function createBase64Digest(body, hash = "sha256") {
  if (Array.isArray(hash)) {
    return new Map(hash.map((h) => [h, createBase64Digest(body, h)]));
  }
  return (0, import_node_crypto.createHash)(hash).update(body).digest("base64");
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
var SignatureMissmatchWithProvidedAlgorithmError = class extends Error {
  constructor(providedAlgorithm, detectedAlgorithm, realKeyType) {
    super(`Provided algorithm does not match the public key type: provided=${detectedAlgorithm}(${providedAlgorithm}}, real=${realKeyType}`);
  }
};
function detectAndVerifyAlgorithm(algorithm, publicKey) {
  algorithm = algorithm?.toLowerCase();
  const realKeyType = publicKey.asymmetricKeyType;
  if (algorithm && algorithm !== "hs2019" && realKeyType) {
    const providedKeyAlgorithm = algorithm.split("-")[0];
    if (providedKeyAlgorithm !== realKeyType.toLowerCase() && !(providedKeyAlgorithm === "ecdsa" && realKeyType === "ec")) {
      throw new SignatureMissmatchWithProvidedAlgorithmError(algorithm, providedKeyAlgorithm, realKeyType);
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

// src/draft/verify.ts
var crypto4 = __toESM(require("node:crypto"), 1);
function verifyDraftSignature(parsed, publicKeyPem, errorLogger) {
  const publicKey = crypto4.createPublicKey(publicKeyPem);
  try {
    const detected = detectAndVerifyAlgorithm(parsed.params.algorithm, publicKey);
    return crypto4.verify(detected.hashAlg, Buffer.from(parsed.signingString), publicKey, Buffer.from(parsed.params.signature, "base64"));
  } catch (e) {
    if (errorLogger)
      errorLogger(e);
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClockSkewInvalidError,
  DraftSignatureHeaderKeys,
  InvalidRequestError,
  RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError,
  SignatureHeaderClockInvalidError,
  SignatureHeaderContentLackedError,
  SignatureHeaderNotFoundError,
  SignatureMissmatchWithProvidedAlgorithmError,
  checkClockSkew,
  detectAndVerifyAlgorithm,
  digestHeaderRegEx,
  genDraftAuthorizationHeader,
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
  verifyRFC3230DigestHeader
});
