// src/pem/spki.ts
import ASN12 from "@lapo/asn1js";
import Hex from "@lapo/asn1js/hex.js";
import Base64 from "@lapo/asn1js/base64.js";

// src/pem/pkcs1.ts
import ASN1 from "@lapo/asn1js";
var Pkcs1ParseError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function parsePkcs1(input) {
  const parsed = ASN1.decode(decodePem(input));
  if (!parsed.sub || parsed.sub.length !== 2)
    throw new Pkcs1ParseError("Invalid SPKI (invalid sub length)");
  const modulus = parsed.sub[0];
  const publicExponent = parsed.sub[1];
  if (!modulus || modulus.tag.tagNumber !== 2)
    throw new Pkcs1ParseError("Invalid SPKI (invalid modulus)");
  if (!publicExponent || publicExponent.tag.tagNumber !== 2)
    throw new Pkcs1ParseError("Invalid SPKI (invalid publicExponent)");
  return {
    pkcs1: asn1ToArrayBuffer(parsed),
    modulus: (asn1ToArrayBuffer(modulus, true).byteLength - 1) * 8,
    publicExponent: parseInt(publicExponent.content() || "0")
  };
}
var rsaASN1AlgorithmIdentifier = Uint8Array.from([
  48,
  13,
  6,
  9,
  42,
  134,
  72,
  134,
  247,
  13,
  1,
  1,
  1,
  // 1.2.840.113549.1.1.1
  5,
  0
]);
function genSpkiFromPkcs1(input) {
  const { pkcs1 } = parsePkcs1(input);
  const pkcsLength = genASN1Length(pkcs1.byteLength + 1);
  const rootContent = Uint8Array.from([
    ...rsaASN1AlgorithmIdentifier,
    3,
    ...pkcsLength,
    // BIT STRING
    0,
    ...new Uint8Array(pkcs1)
  ]);
  return Uint8Array.from([
    48,
    ...genASN1Length(rootContent.length),
    // SEQUENCE
    ...rootContent
  ]);
}

// src/pem/spki.ts
var SpkiParseError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function getPublicKeyAlgorithmNameFromOid(oidStr) {
  const oid = oidStr.split("\n")[0].trim();
  if (oid === "1.2.840.113549.1.1.1")
    return "RSASSA-PKCS1-v1_5";
  if (oid === "1.2.840.113549.1.1.7")
    return "RSA-PSS";
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
function asn1ToArrayBuffer(asn1, contentOnly = false) {
  const fullEnc = asn1.stream.enc;
  const start = contentOnly ? asn1.posContent() : asn1.posStart();
  const end = asn1.posEnd();
  if (typeof fullEnc === "string") {
    return Uint8Array.from(fullEnc.slice(start, end), (s) => s.charCodeAt(0)).buffer;
  } else if (fullEnc instanceof Uint8Array) {
    return fullEnc.buffer.slice(start, end);
  }
  if (fullEnc instanceof ArrayBuffer) {
    return new Uint8Array(fullEnc.slice(start, end)).buffer;
  } else if (Array.isArray(fullEnc)) {
    return new Uint8Array(fullEnc.slice(start, end)).buffer;
  }
  throw new SpkiParseError("Invalid SPKI (invalid ASN1 Stream data)");
}
var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
function decodePem(input) {
  const der = typeof input === "string" ? reHex.test(input) ? Hex.decode(input) : Base64.unarmor(input) : input;
  return der;
}
function parseAlgorithmIdentifier(input) {
  const algorithmIdentifierSub = input.sub;
  if (!algorithmIdentifierSub)
    throw new SpkiParseError("Invalid AlgorithmIdentifier");
  if (algorithmIdentifierSub.length === 0)
    throw new SpkiParseError("Invalid AlgorithmIdentifier (sub length, zero)");
  if (algorithmIdentifierSub.length > 2)
    throw new SpkiParseError("Invalid AlgorithmIdentifier (sub length, too many)");
  if (algorithmIdentifierSub[0].tag.tagNumber !== 6)
    throw new SpkiParseError("Invalid AlgorithmIdentifier (.sub[0] type)");
  const algorithm = algorithmIdentifierSub[0]?.content() ?? null;
  if (typeof algorithm !== "string")
    throw new SpkiParseError("Invalid AlgorithmIdentifier (invalid content)");
  const parameter = algorithmIdentifierSub[1]?.content() ?? null;
  return {
    algorithm,
    parameter
  };
}
function parseSpki(input) {
  const parsed = ASN12.decode(decodePem(input));
  if (!parsed.sub || parsed.sub.length === 0 || parsed.sub.length > 2)
    throw new SpkiParseError("Invalid SPKI (invalid sub)");
  return {
    der: asn1ToArrayBuffer(parsed),
    ...parseAlgorithmIdentifier(parsed.sub[0])
  };
}
function parsePublicKey(input) {
  try {
    return parseSpki(input);
  } catch (e) {
    try {
      const { pkcs1 } = parsePkcs1(input);
      const spki = genSpkiFromPkcs1(new Uint8Array(pkcs1));
      return parseSpki(spki);
    } catch (e2) {
      throw new SpkiParseError("Invalid SPKI or PKCS#1");
    }
  }
}

// src/utils.ts
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
function numberToUint8Array(num) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(num), false);
  const viewUint8Array = new Uint8Array(buf);
  const firstNonZero = viewUint8Array.findIndex((v) => v !== 0);
  return viewUint8Array.slice(firstNonZero);
}
function genASN1Length(length) {
  if (length < 0x80n) {
    return new Uint8Array([Number(length)]);
  }
  const lengthUint8Array = numberToUint8Array(length);
  return new Uint8Array([128 + lengthUint8Array.length, ...lengthUint8Array]);
}
function encodeArrayBufferToBase64(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const binary = String.fromCharCode(...uint8Array);
  return btoa(binary);
}
function decodeBase64ToUint8Array(base64) {
  return Uint8Array.from(atob(base64), (s) => s.charCodeAt(0));
}
var KeyValidationError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function genSignInfo(parsed, defaults = {
  hash: "SHA-256",
  ec: "DSA"
}) {
  const algorithm = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);
  if (!algorithm)
    throw new KeyValidationError("Unknown algorithm");
  if (algorithm === "RSASSA-PKCS1-v1_5") {
    return {
      name: "RSASSA-PKCS1-v1_5",
      hash: defaults.hash ?? "SHA-256"
    };
  }
  if (algorithm === "EC") {
    if (typeof parsed.parameter !== "string")
      throw new KeyValidationError("Invalid EC parameter");
    return {
      name: `EC${defaults.ec}`,
      hash: defaults.hash ?? "SHA-256",
      namedCurve: getNistCurveFromOid(parsed.parameter)
    };
  }
  if (algorithm === "Ed25519") {
    return { name: "Ed25519" };
  }
  if (algorithm === "Ed448") {
    return { name: "Ed448" };
  }
  throw new KeyValidationError("Unknown algorithm");
}
function splitPer64Chars(str) {
  const result = [];
  for (let i = 0; i < str.length; i += 64) {
    result.push(str.slice(i, i + 64));
  }
  return result;
}

// src/pem/pkcs8.ts
import ASN13 from "@lapo/asn1js";
var Pkcs8ParseError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function parsePkcs8(input) {
  const parsed = ASN13.decode(decodePem(input));
  if (!parsed.sub || parsed.sub.length < 3 || parsed.sub.length > 4)
    throw new Pkcs8ParseError("Invalid PKCS#8 (invalid sub length)");
  const version = parsed.sub[0];
  if (!version || !version.tag || version.tag.tagNumber !== 2)
    throw new Pkcs8ParseError("Invalid PKCS#8 (invalid version)");
  const privateKeyAlgorithm = parseAlgorithmIdentifier(parsed.sub[1]);
  const privateKey = parsed.sub[2];
  if (!privateKey || !privateKey.tag || privateKey.tag.tagNumber !== 4)
    throw new Pkcs8ParseError("Invalid PKCS#8 (invalid privateKey)");
  const attributes = parsed.sub[3];
  if (attributes) {
    if (attributes.tag.tagNumber !== 49)
      throw new Pkcs8ParseError("Invalid PKCS#8 (invalid attributes)");
  }
  return {
    der: asn1ToArrayBuffer(parsed),
    ...privateKeyAlgorithm,
    attributesRaw: attributes ? asn1ToArrayBuffer(attributes) : null
  };
}

// src/draft/const.ts
var keyHashAlgosForDraftEncofing = {
  "SHA": "sha1",
  "SHA-1": "sha1",
  "SHA-256": "sha256",
  "SHA-384": "sha384",
  "SHA-512": "sha512",
  "MD5": "md5"
};
var keyHashAlgosForDraftDecoding = {
  "sha1": "SHA",
  "sha256": "SHA-256",
  "sha384": "SHA-384",
  "sha512": "SHA-512",
  "md5": "MD5"
};

// src/draft/sign.ts
function getDraftAlgoString(algorithm) {
  const verifyHash = () => {
    if (!algorithm.hash)
      throw new Error(`hash is required`);
    if (!(algorithm.hash in keyHashAlgosForDraftEncofing))
      throw new Error(`unsupported hash: ${algorithm.hash}`);
  };
  if (algorithm.name === "RSASSA-PKCS1-v1_5") {
    verifyHash();
    return `rsa-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
  }
  if (algorithm.name === "ECDSA") {
    verifyHash();
    return `ecdsa-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
  }
  if (algorithm.name === "ECDH") {
    verifyHash();
    return `ecdh-${keyHashAlgosForDraftEncofing[algorithm.hash]}`;
  }
  if (algorithm.name === "Ed25519") {
    return `ed25519-sha512`;
  }
  if (algorithm.name === "Ed448") {
    return `ed448`;
  }
  throw new Error(`unsupported keyAlgorithm`);
}
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
async function genDraftSignature(privateKey, signingString) {
  const signatureAB = await globalThis.crypto.subtle.sign(privateKey.algorithm, privateKey, new TextEncoder().encode(signingString));
  return encodeArrayBufferToBase64(signatureAB);
}
function genDraftSignatureHeader(includeHeaders, keyId, signature, algorithm) {
  return `keyId="${keyId}",algorithm="${algorithm}",headers="${includeHeaders.join(" ")}",signature="${signature}"`;
}
async function signAsDraftToRequest(request, key, includeHeaders, opts = {}) {
  const hash = opts?.hashAlgorithm || "SHA-256";
  const parsedPrivateKey = parsePkcs8(key.privateKeyPem);
  const importParams = genSignInfo(parsedPrivateKey, { hash, ec: "DSA" });
  const privateKey = await globalThis.crypto.subtle.importKey("pkcs8", parsedPrivateKey.der, importParams, false, ["sign"]);
  const algoString = getDraftAlgoString(importParams);
  const signingString = genDraftSigningString(request, includeHeaders, { keyId: key.keyId, algorithm: algoString });
  const signature = await genDraftSignature(privateKey, signingString);
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
  const requiredHeaders = options?.requiredComponents?.draft || options?.requiredInputs?.draft;
  if (requiredHeaders) {
    for (const requiredInput of requiredHeaders) {
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
async function exportPublicKeyPem(key) {
  const ab = await globalThis.crypto.subtle.exportKey("spki", key);
  return "-----BEGIN PUBLIC KEY-----\n" + splitPer64Chars(encodeArrayBufferToBase64(ab)).join("\n") + "\n-----END PUBLIC KEY-----\n";
}
async function exportPrivateKeyPem(key) {
  const ab = await globalThis.crypto.subtle.exportKey("pkcs8", key);
  return "-----BEGIN PRIVATE KEY-----\n" + splitPer64Chars(encodeArrayBufferToBase64(ab)).join("\n") + "\n-----END PRIVATE KEY-----\n";
}
async function genRsaKeyPair(modulusLength = 4096, keyUsage = ["sign", "verify"]) {
  const keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    keyUsage
  );
  return {
    publicKey: await exportPublicKeyPem(keyPair.publicKey),
    privateKey: await exportPrivateKeyPem(keyPair.privateKey)
  };
}
async function genEcKeyPair(namedCurve = "P-256", keyUsage = ["sign", "verify"]) {
  const keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve
    },
    true,
    keyUsage
  );
  return {
    publicKey: await exportPublicKeyPem(keyPair.publicKey),
    privateKey: await exportPrivateKeyPem(keyPair.privateKey)
  };
}
async function genEd25519KeyPair(keyUsage = ["sign", "verify"]) {
  const keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "Ed25519"
    },
    true,
    keyUsage
  );
  return {
    publicKey: await exportPublicKeyPem(keyPair.publicKey),
    privateKey: await exportPrivateKeyPem(keyPair.privateKey)
  };
}
async function genEd448KeyPair(keyUsage) {
  const keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "Ed448"
    },
    true,
    keyUsage
  );
  return {
    publicKey: await exportPublicKeyPem(keyPair.publicKey),
    privateKey: await exportPrivateKeyPem(keyPair.privateKey)
  };
}

// src/digest/utils.ts
import { webcrypto as crypto } from "node:crypto";
async function createBase64Digest(body, hash = "SHA-256") {
  if (Array.isArray(hash)) {
    return new Map(await Promise.all(hash.map((h) => {
      return (async () => [h, await createBase64Digest(body, h)])();
    })));
  }
  if (hash === "SHA") {
    hash = "SHA-1";
  }
  if (typeof body === "string") {
    body = new TextEncoder().encode(body);
  }
  const hashAb = await crypto.subtle.digest(hash, body);
  return encodeArrayBufferToBase64(hashAb);
}

// src/digest/digest-rfc3230.ts
async function genRFC3230DigestHeader(body, hashAlgorithm) {
  return `${hashAlgorithm}=${await createBase64Digest(body, hashAlgorithm)}`;
}
var digestHeaderRegEx = /^([a-zA-Z0-9\-]+)=([^\,]+)/;
async function verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest = true, errorLogger) {
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
  const algo = match[1];
  if (!algo) {
    if (errorLogger)
      errorLogger(`Invalid Digest header algorithm: ${match[1]}`);
    return false;
  }
  const hash = await createBase64Digest(rawBody, algo);
  if (hash !== value) {
    if (errorLogger)
      errorLogger(`Digest header hash mismatch`);
    return false;
  }
  return true;
}

// src/digest/digest.ts
async function verifyDigestHeader(request, rawBody, failOnNoDigest = true, errorLogger) {
  const headerKeys = objectLcKeys(request.headers);
  if (headerKeys.has("content-digest")) {
    throw new Error("Not implemented yet");
  } else if (headerKeys.has("digest")) {
    return await verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest, errorLogger);
  }
  if (failOnNoDigest) {
    if (errorLogger)
      errorLogger("Content-Digest or Digest header not found");
    return false;
  }
  return true;
}

// src/shared/verify.ts
var KeyHashValidationError = class extends Error {
  constructor(message) {
    super(message);
  }
};
function buildErrorMessage(providedAlgorithm, real) {
  return `Provided algorithm does not match the public key type: provided=${providedAlgorithm}, real=${real}`;
}
function parseSignInfo(algorithm, parsed, errorLogger) {
  algorithm = algorithm?.toLowerCase();
  const realKeyType = getPublicKeyAlgorithmNameFromOid(parsed.algorithm);
  if (realKeyType === "RSA-PSS") {
    if (algorithm === "rsa-pss-sha512") {
      return { name: "RSA-PSS", hash: "SHA-512" };
    }
  }
  if (realKeyType === "RSASSA-PKCS1-v1_5") {
    if (!algorithm || algorithm === "hs2019" || algorithm === "rsa-sha256" || algorithm === "rsa-v1_5-sha256") {
      return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    }
    if (algorithm === "rsa-pss-sha512") {
      return { name: "RSA-PSS", hash: "SHA-512" };
    }
    const [parsedName, hash] = algorithm.split("-");
    if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
      throw new KeyHashValidationError(`unsupported hash: ${hash}`);
    }
    if (parsedName === "rsa") {
      return { name: "RSASSA-PKCS1-v1_5", hash: keyHashAlgosForDraftDecoding[hash] };
    }
    throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
  }
  if (realKeyType === "EC") {
    if (!algorithm || algorithm === "hs2019" || algorithm === "ecdsa-sha256") {
      return { name: "ECDSA", hash: "SHA-256", namedCurve: getNistCurveFromOid(parsed.parameter) };
    }
    if (algorithm === "ecdsa-p256-sha256") {
      const namedCurve = getNistCurveFromOid(parsed.parameter);
      if (namedCurve !== "P-256") {
        throw new KeyHashValidationError(`curve is not P-256: ${namedCurve}`);
      }
      return { name: "ECDSA", hash: "SHA-256", namedCurve };
    }
    if (algorithm === "ecdsa-p384-sha384") {
      const namedCurve = getNistCurveFromOid(parsed.parameter);
      if (namedCurve !== "P-384") {
        throw new KeyHashValidationError(`curve is not P-384: ${namedCurve}`);
      }
      return { name: "ECDSA", hash: "SHA-256", namedCurve: getNistCurveFromOid(parsed.parameter) };
    }
    const [dsaOrDH, hash] = algorithm.split("-");
    if (!hash || !(hash in keyHashAlgosForDraftDecoding)) {
      throw new KeyHashValidationError(`unsupported hash: ${hash}`);
    }
    if (dsaOrDH === "ecdsa") {
      return { name: "ECDSA", hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
    }
    if (dsaOrDH === "ecdh") {
      return { name: "ECDH", hash: keyHashAlgosForDraftDecoding[hash], namedCurve: getNistCurveFromOid(parsed.parameter) };
    }
    throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
  }
  if (realKeyType === "Ed25519") {
    if (!algorithm || algorithm === "hs2019" || algorithm === "ed25519-sha512" || algorithm === "ed25519") {
      return { name: "Ed25519" };
    }
    throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
  }
  if (realKeyType === "Ed448") {
    if (!algorithm || algorithm === "hs2019" || algorithm === "ed448") {
      return { name: "Ed448" };
    }
    throw new KeyHashValidationError(buildErrorMessage(algorithm, parsed.algorithm));
  }
  throw new KeyHashValidationError(`unsupported keyAlgorithm: ${realKeyType} (provided: ${algorithm})`);
}

// src/draft/verify.ts
var genSignInfoDraft = parseSignInfo;
async function verifyDraftSignature(parsed, publicKeyPem, errorLogger) {
  try {
    const parsedSpki = parsePublicKey(publicKeyPem);
    const publicKey = await globalThis.crypto.subtle.importKey("spki", parsedSpki.der, genSignInfo(parsedSpki), false, ["verify"]);
    const verify = await globalThis.crypto.subtle.verify(publicKey.algorithm, publicKey, decodeBase64ToUint8Array(parsed.params.signature), new TextEncoder().encode(parsed.signingString));
    return verify;
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
  KeyValidationError,
  Pkcs1ParseError,
  Pkcs8ParseError,
  RequestHasMultipleDateHeadersError,
  RequestHasMultipleSignatureHeadersError,
  SignatureHeaderNotFoundError,
  SpkiParseError,
  UnknownSignatureHeaderFormatError,
  asn1ToArrayBuffer,
  checkClockSkew,
  decodeBase64ToUint8Array,
  decodePem,
  digestHeaderRegEx,
  encodeArrayBufferToBase64,
  exportPrivateKeyPem,
  exportPublicKeyPem,
  genASN1Length,
  genDraftSignature,
  genDraftSignatureHeader,
  genDraftSigningString,
  genEcKeyPair,
  genEd25519KeyPair,
  genEd448KeyPair,
  genRFC3230DigestHeader,
  genRsaKeyPair,
  genSignInfo,
  genSignInfoDraft,
  genSpkiFromPkcs1,
  getDraftAlgoString,
  getNistCurveFromOid,
  getPublicKeyAlgorithmNameFromOid,
  keyHashAlgosForDraftDecoding,
  keyHashAlgosForDraftEncofing,
  lcObjectGet,
  lcObjectKey,
  numberToUint8Array,
  objectLcKeys,
  parseAlgorithmIdentifier,
  parseDraftRequest,
  parseDraftRequestSignatureHeader,
  parsePkcs1,
  parsePkcs8,
  parsePublicKey,
  parseRequestSignature,
  parseSpki,
  requestIsRFC9421,
  rsaASN1AlgorithmIdentifier,
  signAsDraftToRequest,
  signatureHeaderIsDraft,
  splitPer64Chars,
  validateAndProcessParsedDraftSignatureHeader,
  validateRequestAndGetSignatureHeader,
  verifyDigestHeader,
  verifyDraftSignature,
  verifyRFC3230DigestHeader
};
