/// <reference types="node" />
import type { IncomingRequest, MapLikeObj, OutgoingResponse, SFVSignatureInputDictionary, SFVSignatureInputDictionaryForInput, HeadersLike } from "../types";
/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field (header) name
 * value: item, list, dict
 */
export type SFVHeaderTypeDictionary = Record<string, 'item' | 'list' | 'dict'>;
export declare const sfvHeaderTypeDictionaryIKnow: {
    signature: "dict";
    'signature-input': "dict";
    'content-digest': "dict";
};
export declare const requestTargetDerivedComponents: string[];
export declare const responseTargetDerivedComponents: string[];
export type Kot<T> = keyof T extends 'req' ? T : null;
/**
 * Class for creating signature base,
 * construct with a request or a response
 */
export declare class RFC9421SignatureBaseFactory<T extends IncomingRequest | OutgoingResponse> {
    sfvTypeDictionary: SFVHeaderTypeDictionary;
    response: OutgoingResponse | null;
    responseHeaders: HeadersLike | null;
    isRequest(): boolean;
    isResponse(): boolean;
    request: IncomingRequest;
    requestHeaders: HeadersLike;
    scheme: string;
    targetUri: string;
    url: URL;
    requestSignatureInput: SFVSignatureInputDictionary | undefined;
    responseSignatureInput: SFVSignatureInputDictionary | undefined;
    constructor(source: T, 
    /**
     * Must be signature params of the request
     */
    requestSignatureParams?: SFVSignatureInputDictionaryForInput | string, scheme?: string, additionalSfvTypeDictionary?: SFVHeaderTypeDictionary, 
    /**
     * Set if provided object is response
     */
    responseSignatureParams?: SFVSignatureInputDictionaryForInput | string);
    /**
     * Collect request or response headers
     */
    getHeadersMap(source: IncomingRequest | OutgoingResponse): HeadersLike;
    static inputSignatureParamsDictionary(input: SFVSignatureInputDictionaryForInput): SFVSignatureInputDictionary;
    get(name: '@query-param', paramsLike?: MapLikeObj<'name', string>): string;
    get(name: string, paramsLike?: MapLikeObj<'req' | 'key', string> | MapLikeObj<'sf' | 'bs' | 'tr', boolean>): string;
    generate(label: string): string;
}
