import type { IncomingRequest, MapLikeObj, OutgoingResponse, SFVSignatureInputDictionary, SFVSignatureInputDictionaryForInput, HeadersLike } from "../types.js";
import { SFVHeaderTypeDictionary } from "./sfv.js";
export declare const requestTargetDerivedComponents: string[];
export declare const responseTargetDerivedComponents: string[];
/**
 * Class for creating signature base.
 * Construct with a request or a response, and generate signature base with `generate` method
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
    requestSignatureInput: SFVSignatureInputDictionary;
    responseSignatureInput: SFVSignatureInputDictionary | undefined;
    requiredComponents: string[] | null;
    /**
     *
     * @param source request or response, must include 'signature-input' header
     *	If source is node response, it must include 'req' property.
     * @param scheme optional, used when source request url starts with '/'
     * @param additionalSfvTypeDictionary additional SFV type dictionary
     * @param request optional, used when source is a browser Response
     * @param requiredComponents
     *   Required components for the signature base. If provided, generate method will throw an error if the label lacks any of the components.
     *   e.g. `['@method', '@authority', '@path', '@query', '"@query-param";name="foo"', 'content-digest', 'accept']`
     */
    constructor(source: T, scheme?: string, additionalSfvTypeDictionary?: SFVHeaderTypeDictionary, request?: Request, requiredComponents?: string[] | null);
    /**
     * Get component value to generate signature base
     * @param name component name
     * @param paramsLike parameters
     */
    get(name: '@query-param', paramsLike?: MapLikeObj<'name', string>): string;
    get(name: string, paramsLike?: MapLikeObj<'req' | 'key', string> | MapLikeObj<'sf' | 'bs' | 'tr', boolean>): string;
    /**
     * Generate signature base for the label
     * If `requiredComponents` is set by the constructor, this method will throw an error if the label lacks any of the components.
     * @param label label of the signature input
     * @returns signature base
     */
    generate(label: string): string;
}
export declare function convertSignatureParamsDictionary(input: SFVSignatureInputDictionaryForInput): string;
