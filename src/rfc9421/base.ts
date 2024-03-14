
// TODO

import { canonicalizeHeaderValue, encodeArrayBufferToBase64, getValueByLc, lcObjectKey, getMap, collectHeaders, isBrowserRequest, isBrowserResponse, getMapWithoutUndefined } from "../utils.js";
import type { IncomingRequest, MapLikeObj, OutgoingResponse, SFVParametersLike, SFVSignatureInputDictionary, SFVSignatureInputDictionaryForInput, HeadersLike, HeadersValueLikeArrayable, SFVSignatureParamsForInput } from "../types.js";
import * as sh from "structured-headers";
import { SFVHeaderTypeDictionary, knownSfvHeaderTypeDictionary } from "./sfv.js";
import { textEncoder } from '../const.js';

// https://datatracker.ietf.org/doc/html/rfc9421#name-initial-contents-3
export const requestTargetDerivedComponents = [
	'@method',
	'@authority',
	'@scheme',
	'@target-uri',
	'@request-target',
	'@path',
	'@query',
];
// https://datatracker.ietf.org/doc/html/rfc9421#name-initial-contents-3
export const responseTargetDerivedComponents = [
	'@status',
];

/**
 * Class for creating signature base,
 * construct with a request or a response
 */
export class RFC9421SignatureBaseFactory<T extends IncomingRequest | OutgoingResponse> {
	public sfvTypeDictionary: SFVHeaderTypeDictionary;

	public response: OutgoingResponse | null;
	public responseHeaders: HeadersLike | null;
	public isRequest() {
		return this.response === null;
	}
	public isResponse() {
		return this.response !== null;
	}

	public request: IncomingRequest;
	public requestHeaders: HeadersLike;
	public scheme: string;
	public targetUri: string;
	public url: URL;
	public requestSignatureInput: SFVSignatureInputDictionary;
	public responseSignatureInput: SFVSignatureInputDictionary | undefined;

	/**
	 *
	 * @param source request or response, must include 'signature-input' header
	 *	If source is node response, it must include 'req' property.
	 * @param scheme optional, used when source request url starts with '/'
	 * @param additionalSfvTypeDictionary additional SFV type dictionary
	 * @param request optional, used when source is a browser Response
	 */
	constructor(
		source: T,
		scheme: string = 'https',
		additionalSfvTypeDictionary: SFVHeaderTypeDictionary = {},
		request?: Request,
	) {
		this.sfvTypeDictionary = lcObjectKey({ ...knownSfvHeaderTypeDictionary, ...additionalSfvTypeDictionary });

		if ('req' in source) {
			this.response = source;
			this.responseHeaders = collectHeaders(source);
			this.request = source.req;
			this.requestHeaders = collectHeaders(this.request);
		} else if (isBrowserResponse(source)) {
			if (!request) throw new Error('Request is not provided');
			this.response = source;
			this.responseHeaders = collectHeaders(source);
			this.request = request;
			this.requestHeaders = collectHeaders(this.request);
		} else {
			this.response = null;
			this.responseHeaders = null;
			this.request = source;
			this.requestHeaders = collectHeaders(source);
		}

		if (!this.request.url) {
			throw new Error('Request URL is empty');
		}
		if (!this.request.method) {
			throw new Error('Request method is empty');
		}

		if (!('signature-input' in this.requestHeaders)) throw new Error('Signature-Input header is not found in request');
		this.requestSignatureInput = sh.parseDictionary(canonicalizeHeaderValue(this.requestHeaders['signature-input'])) as SFVSignatureInputDictionary;

		if (this.isResponse()) {
			if (!this.responseHeaders) throw new Error('responseHeaders is empty');
			if (!('signature-input' in this.responseHeaders)) throw new Error('Signature-Input header is not found in response');
			this.responseSignatureInput = sh.parseDictionary(canonicalizeHeaderValue(this.responseHeaders['signature-input'])) as SFVSignatureInputDictionary;
		}

		this.sfvTypeDictionary = lcObjectKey(additionalSfvTypeDictionary);

		this.scheme = this.request.url.startsWith('/') ? scheme : new URL(this.request.url).protocol.replace(':', '');

		// ブラウザではthis.request.urlが常にhttpで始まるのでrawHostは使わないはず
		const rawHost = ('httpVersionMajor' in this.request && this.request.httpVersionMajor === 2) ?
			this.requestHeaders[':authority']
			: this.requestHeaders['host'];
		if (!isBrowserRequest(this.request) && !rawHost) throw new Error('Host header is empty');
		const host = canonicalizeHeaderValue(rawHost);
		this.targetUri = this.request.url.startsWith('/') ? (new URL(this.request.url, `${scheme}://${host}`)).href : this.request.url;
		this.url = new URL(this.targetUri);
	}

	public get(
		name: '@query-param',
		paramsLike?: MapLikeObj<'name', string>,
	): string
	public get(
		name: string,
		paramsLike?: MapLikeObj<'req' | 'key', string> | MapLikeObj<'sf' | 'bs' | 'tr', boolean>,
	): string
	public get(
		name: string,
		paramsLike: sh.Parameters | SFVParametersLike = new Map(),
	): string {
		const params = getMap(paramsLike) as Map<string, sh.BareItem>;
		const componentIdentifier = sh.serializeItem([name, params]);
		if (!name) {
			throw new Error(`Type is empty: ${componentIdentifier}`);
		}
		if (name.startsWith('"')) {
			if (name.endsWith('"')) {
				name = name.slice(1, -1);
			} else {
				throw new Error(`Invalid component type string: ${componentIdentifier}`);
			}
		}

		if (this.isResponse() && params.get('req') !== true && requestTargetDerivedComponents.includes(name)) {
			throw new Error(`component is not available in response (must use with ;req, or provided object is unintentionally treated as response (existing req prop.)): ${name}`);
		}
		if (this.isRequest() && responseTargetDerivedComponents.includes(name)) {
			throw new Error(`component is not available in request (provided object is unintentionally treated as request (including req prop.)): ${name}`);
		}

		if (this.isRequest() && params.get('req') === true) {
			throw new Error('req param is not available in request (provided object is treated as request, please set req param with Request)');
		}

		const isReq = this.isRequest() || params.get('req') === true; // Request

		if (name === '@signature-params') {
			throw new Error(`@signature-params is not available in get method: ${componentIdentifier}`);
		} else if (name === '@method') {
			if (!this.request.method) {
				throw new Error('Request method is empty');
			}
			return this.request.method.toUpperCase();
		} else if (name === '@authority') {
			return this.url.host;
		} else if (name === '@scheme') {
			return this.scheme.toLocaleLowerCase();
		}	else if (name === '@target-uri') {
			return this.targetUri;
		} else if (name === '@request-target') {
			if (!this.request.method) {
				throw new Error('Request method is empty');
			}
			return `${this.request.method.toLowerCase()} ${this.url.pathname}`;
		} else if (name === '@path') {
			return this.url.pathname;
		} else if (name === '@query') {
			return this.url.search;
		} else if (name === '@query-param') {
			const key = params.get('name');
			if (key === undefined) {
				throw new Error('Query parameter name not found or invalid');
			}
			const value = this.url.searchParams.get(key.toString());
			if (value === null) {
				throw new Error(`Query parameter not found: ${key} (${componentIdentifier})`);
			}
			return value;
		} else if (name === '@status') {
			if (!this.response) throw new Error('response is empty (@status)');
			if (isBrowserResponse(this.response)) {
				return this.response.status.toString();
			} else {
				return this.response.statusCode.toString();
			}
		} else if (name.startsWith('@')) {
			throw new Error(`Unknown derived component: ${name}`);
		} else {
			// https://datatracker.ietf.org/doc/html/rfc9421#section-2.1
			const key = params.get('key') as string;
			const isSf = params.get('sf') === true; // Structed Field
			const isBs = params.get('bs') === true; // Binary-Wrapped
			const isTr = params.get('tr') === true; // Trailer

			if ([key, isSf, isBs].filter(x => x).length > 1) {
				throw new Error(`Invalid component: ${componentIdentifier} (multiple params are specified)`);
			}

			const rawValue: HeadersValueLikeArrayable = (() => {
				if (isReq) {
					if (isTr) {
						if ('trailers' in this.request && this.request.trailers) {
							return getValueByLc(this.request.trailers, name);
						}
						throw new Error(`Trailers not found in request object (${componentIdentifier})`);
					} else {
						return this.requestHeaders[name];
					}
				} else {
					if (!this.response || !this.responseHeaders) throw new Error('response is not provided');
					if (isTr) {
						if ('trailers' in this.response && this.response.trailers) {
							return getValueByLc(this.response.trailers, name);
						}
						throw new Error(`Trailers not found in response object (${componentIdentifier})`);
					} else {
						return this.responseHeaders[name];
					}
				}
			})();

			if (rawValue === undefined) {
				throw new Error(`Header not found: ${componentIdentifier}`);
			}

			if (isSf) {
				// https://datatracker.ietf.org/doc/html/rfc9421#name-strict-serialization-of-htt
				if (!(name in this.sfvTypeDictionary)) {
					throw new Error(`Type not found in SFV type dictionary: ${name}`);
				}
				const canonicalized = canonicalizeHeaderValue(rawValue);
				if (this.sfvTypeDictionary[name] === 'dict') {
					return sh.serializeDictionary(sh.parseDictionary(canonicalized));
				} else if (this.sfvTypeDictionary[name] === 'list') {
					return sh.serializeList(sh.parseList(canonicalized));
				} else if (['item', 'bs', 'int', 'dec', 'str', 'bool', 'token'].includes(this.sfvTypeDictionary[name])) {
					return sh.serializeItem(sh.parseItem(canonicalized));
				}
			}

			if (key) {
				// https://datatracker.ietf.org/doc/html/rfc9421#name-dictionary-structured-field
				if (!(name in this.sfvTypeDictionary)) {
					throw new Error(`key specified but type unknown (Type not found in SFV type dictionary): ${componentIdentifier}`);
				}
				if (typeof rawValue !== 'string') {
					throw new Error(`Key specified but value is not a string: ${componentIdentifier}`);
				}
				if (this.sfvTypeDictionary[name] === 'dict') {
					const dictionary = sh.parseDictionary(rawValue);
					const value = dictionary.get(key);
					if (value === undefined) {
						throw new Error(`Key not found in dictionary: ${key} (${componentIdentifier})`);
					}
					if (Array.isArray(value[0])) {
						return sh.serializeList([value as sh.InnerList]);
					} else {
						return sh.serializeItem(value as sh.Item);
					}
				} else {
					throw new Error(`"${name}" is not dict: ${this.sfvTypeDictionary[name]} (${componentIdentifier})`);
				}
			}

			if (isBs) {
				// https://datatracker.ietf.org/doc/html/rfc9421#section-2.1.3
				const sequences = (Array.isArray(rawValue) ? rawValue : [rawValue])
					.map(x => {
						if (typeof x !== 'string') {
							throw new Error(`Invalid header value type: ${typeof x}`);
						}
						return [
							new sh.ByteSequence(
								encodeArrayBufferToBase64(
									textEncoder.encode(canonicalizeHeaderValue(x)).buffer
								)
							),
							new Map()
						] as sh.Item;
					});
				return sh.serializeList(sequences);
			}

			return canonicalizeHeaderValue(rawValue);
		}
	}

	public generate(label: string): string {
		const item = this.isRequest() ? this.requestSignatureInput?.get(label) : this.responseSignatureInput?.get(label);
		if (!item) {
			throw new Error(`label not found: ${label}`);
		}
		if (!Array.isArray(item[0])) {
			throw new Error(`item is not InnerList: ${sh.serializeDictionary(new Map([[label, item]]))}`);
		}

		const results = new Map<string, string>();
		for (const component of item[0]) {
			let name = component[0];
			if (name.startsWith('"')) {
				if (name.endsWith('"')) {
					// Remove double quotes
					name = name.slice(1, -1);
				} else {
					throw new Error(`Invalid component identifier name: ${name}`);
				}
			}
			component[0] = name; // Must be wrapped with double quotes while serializing
			const componentIdentifier = sh.serializeItem(component);
			if (results.has(componentIdentifier)) {
				throw new Error(`Duplicate key: ${name}`);
			}
			results.set(componentIdentifier, this.get(name, component[1] as any));
		}

		results.set('"@signature-params"', sh.serializeInnerList(item));

		return Array.from(results.entries(), ([key, value]) => `${key}: ${value}`).join('\n');
	}
}

export function convertSignatureParamsDictionary(input: SFVSignatureInputDictionaryForInput): string {
	const map = getMap(input) as Map<string, SFVSignatureParamsForInput>;
	const output = new Map() as SFVSignatureInputDictionary;
	for (const [label, item] of map) {
		if (!Array.isArray(item)) throw new Error('item is not array');
		const [components, params] = item;
		output.set(
			label,
			[
				components.map(
					identifier => typeof identifier === 'string' ?
						[identifier, new Map()]
						: [identifier[0], getMapWithoutUndefined(identifier[1]) as Map<string, string | boolean>]
				),
				getMapWithoutUndefined(params),
			],
		);
	}
	return sh.serializeDictionary(output);
}
