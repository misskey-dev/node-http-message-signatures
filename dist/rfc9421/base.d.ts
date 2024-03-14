import type { IncomingRequest, MapLikeObj, OutgoingResponse, SFVSignatureInputDictionary, SFVSignatureInputDictionaryForInput, HeadersLike } from "../types.js";
import { SFVHeaderTypeDictionary } from "./sfv.js";
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
    /**
     *
     * @param source request or response, must include 'signature-input' header
     *	If source is node response, it must include 'req' property.
     * @param scheme optional, used when source request url starts with '/'
     * @param additionalSfvTypeDictionary additional SFV type dictionary
     * @param request optional, used when source is a browser Response
     */
    constructor(source: T, scheme?: string, additionalSfvTypeDictionary?: SFVHeaderTypeDictionary, request?: Request);
    get(name: '@query-param', paramsLike?: MapLikeObj<'name', string>): string;
    get(name: string, paramsLike?: MapLikeObj<'req' | 'key', string> | MapLikeObj<'sf' | 'bs' | 'tr', boolean>): string;
    generate(label: string): string;
}
export declare function convertSignatureParamsDictionary(input: SFVSignatureInputDictionaryForInput): string;
