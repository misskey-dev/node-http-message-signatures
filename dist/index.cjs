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
  HttpSignatureDraft: () => HttpSignatureDraft,
  InvalidRequestError: () => InvalidRequestError,
  RequestHasMultipleDateHeadersError: () => RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError: () => RequestHasMultipleSignatureHeadersError,
  SignatureHeaderNotFoundError: () => SignatureHeaderNotFoundError,
  SignatureMissmatchWithProvidedAlgorithmError: () => SignatureMissmatchWithProvidedAlgorithmError,
  checkClockSkew: () => checkClockSkew,
  detectAndVerifyAlgorithm: () => detectAndVerifyAlgorithm,
  genEcKeyPair: () => genEcKeyPair,
  genEd25519KeyPair: () => genEd25519KeyPair,
  genEd448KeyPair: () => genEd448KeyPair,
  genRsaKeyPair: () => genRsaKeyPair,
  getDraftAlgoString: () => getDraftAlgoString,
  lcObjectKey: () => lcObjectKey,
  parseRequest: () => parseRequest,
  prepareSignInfo: () => prepareSignInfo,
  signatureHeaderIsDraft: () => signatureHeaderIsDraft,
  toSpkiPublicKey: () => toSpkiPublicKey,
  validateRequestAndGetSignatureHeader: () => validateRequestAndGetSignatureHeader
});
module.exports = __toCommonJS(src_exports);

// src/draft/parse.ts
var parse_exports = {};
__export(parse_exports, {
  SignatureHeaderContentLackedError: () => SignatureHeaderContentLackedError,
  parseDraftRequest: () => parseDraftRequest,
  parseDraftRequestSignatureHeader: () => parseDraftRequestSignatureHeader
});

// src/draft/sign.ts
var sign_exports = {};
__export(sign_exports, {
  genDraftAuthorizationHeader: () => genDraftAuthorizationHeader,
  genDraftSignature: () => genDraftSignature,
  genDraftSignatureHeader: () => genDraftSignatureHeader,
  genDraftSigningString: () => genDraftSigningString,
  signAsDraftToRequest: () => signAsDraftToRequest
});
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

// src/draft/sign.ts
function genDraftSigningString(request, includeHeaders) {
  request.headers = lcObjectKey(request.headers);
  const results = [];
  for (const key of includeHeaders.map((x) => x.toLowerCase())) {
    if (key === "(request-target)") {
      results.push(`(request-target): ${request.method.toLowerCase()} ${request.url.startsWith("/") ? request.url : new URL(request.url).pathname}`);
    } else {
      if (key === "date" && !request.headers["date"] && request.headers["x-date"]) {
        results.push(`date: ${request.headers["x-date"]}`);
      } else {
        results.push(`${key}: ${request.headers[key]}`);
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

// src/draft/parse.ts
var SignatureHeaderContentLackedError = class extends Error {
  constructor(lackedContent) {
    super(`Signature header content lacked: ${lackedContent}`);
  }
};
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
function validateAndProcessParsedDraftSignatureHeader(parsed, headers) {
  if (!parsed.keyId)
    throw new SignatureHeaderContentLackedError("keyId");
  if (!parsed.algorithm)
    throw new SignatureHeaderContentLackedError("algorithm");
  if (!parsed.signature)
    throw new SignatureHeaderContentLackedError("signature");
  if (!parsed.headers && !headers)
    throw new SignatureHeaderContentLackedError("headers");
  return {
    keyId: parsed.keyId,
    algorithm: parsed.algorithm.toLowerCase(),
    signature: parsed.signature,
    headers: parsed.headers ? parsed.headers.split(" ") : headers
  };
}
function parseDraftRequest(request, options) {
  const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
  const parsedSignatureHeader = validateAndProcessParsedDraftSignatureHeader(parseDraftRequestSignatureHeader(signatureHeader), options?.headers);
  const signingString = genDraftSigningString(request, parsedSignatureHeader.headers);
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
  const signatureHeader = request.headers["signature"] || request.headers["Signature"];
  if (!signatureHeader)
    throw new SignatureHeaderNotFoundError();
  if (Array.isArray(signatureHeader))
    throw new RequestHasMultipleSignatureHeadersError();
  if (request.headers["date"]) {
    if (Array.isArray(request.headers["date"]))
      throw new RequestHasMultipleDateHeadersError();
    checkClockSkew(new Date(request.headers["date"]), clock?.now || /* @__PURE__ */ new Date(), clock?.delay, clock?.forward);
  } else if (request.headers["x-date"]) {
    if (Array.isArray(request.headers["x-date"]))
      throw new RequestHasMultipleDateHeadersError();
    checkClockSkew(new Date(request.headers["x-date"]), clock?.now || /* @__PURE__ */ new Date(), clock?.delay, clock?.forward);
  }
  if (!request.method)
    throw new InvalidRequestError("Request method not found");
  if (!request.url)
    throw new InvalidRequestError("Request URL not found");
  return signatureHeader;
}
function parseRequest(request, options) {
  const signatureHeader = validateRequestAndGetSignatureHeader(request, options?.clockSkew);
  if (signatureHeaderIsDraft(signatureHeader)) {
    return parseDraftRequest(request, options);
  } else {
    throw new Error("Not implemented");
  }
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
var verify_exports = {};
__export(verify_exports, {
  verifySignature: () => verifySignature
});
var crypto4 = __toESM(require("node:crypto"), 1);
function verifySignature(parsed, publicKeyPem, errorLogger) {
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

// src/index.ts
var HttpSignatureDraft = {
  ...parse_exports,
  ...sign_exports,
  ...verify_exports
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClockSkewInvalidError,
  HttpSignatureDraft,
  InvalidRequestError,
  RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError,
  SignatureHeaderNotFoundError,
  SignatureMissmatchWithProvidedAlgorithmError,
  checkClockSkew,
  detectAndVerifyAlgorithm,
  genEcKeyPair,
  genEd25519KeyPair,
  genEd448KeyPair,
  genRsaKeyPair,
  getDraftAlgoString,
  lcObjectKey,
  parseRequest,
  prepareSignInfo,
  signatureHeaderIsDraft,
  toSpkiPublicKey,
  validateRequestAndGetSignatureHeader
});
