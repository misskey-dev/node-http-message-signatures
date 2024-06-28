/**
 * Parse Request
 */
import { RequestParseOptions, validateRequestAndGetSignatureHeader } from "../shared/parse.js";
import type { IncomingRequest, ParsedRFC9421SignatureValueWithBase, OutgoingResponse, SFVSignatureInputDictionary, ParsedRFC9421Signature, SFVSignatureParams } from '../types.js';
import { RFC9421SignatureBaseFactory } from './base.js';
import * as sh from 'structured-headers';
export declare const RFC9421SignatureParams: readonly ["created", "expires", "nonce", "alg", "keyid", "tag"];
/**
 * Validate signature-input parameters
 * * The check of components by requiredComponents is not performed here, but is performed during Factory.generate in parseSingleRFC9421Signature.
 */
export declare function validateRFC9421SignatureInputParameters(input: sh.Dictionary, options?: RequestParseOptions): input is SFVSignatureInputDictionary;
/**
 * Generates base and returns parsed signature.
 * * The check of components by requiredComponents will be performed here.
 */
export declare function parseSingleRFC9421Signature(label: string, factory: RFC9421SignatureBaseFactory<IncomingRequest | OutgoingResponse>, params: SFVSignatureParams, signature: sh.ByteSequence): ParsedRFC9421SignatureValueWithBase;
export declare function parseRFC9421RequestOrResponse(request: IncomingRequest | OutgoingResponse, options?: RequestParseOptions, validated?: ReturnType<typeof validateRequestAndGetSignatureHeader>, errorLogger?: (message: any) => any): ParsedRFC9421Signature;
