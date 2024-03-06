
// TODO

import { canonicalizeHeaderValue, encodeArrayBufferToBase64, getLc, lcObjectKey, getMap } from "../utils";
import { IncomingRequest, MapLike, OutgoingResponse, SFVParametersLike, SFVSignatureInputDictionary, SFVSignatureInputDictionaryForInput } from "../types";
import * as sh from "structured-headers";

/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field (header) name
 * value: item, list, dict
 */
export type SFVHeaderTypeDictionary = Record<string, 'item' | 'list' | 'dict'>

export const sfvHeaderTypeDictionaryIKnow = {
	'signature': 'dict',
	'signature-input': 'dict',
	'content-digest': 'dict',
} satisfies SFVHeaderTypeDictionary;

export const availableDerivedComponents = [
	'@method',
	'@authority',
	'@scheme',
	'@target-uri',
	'@request-target',
	'@path',
	'@query',
];

/**
 * Class for creating signature base,
 * construct with a request or a response
 */
export class RFC9421SignatureBaseFactory {
	public sfvTypeDictionary: SFVHeaderTypeDictionary;

	public response: OutgoingResponse | null;
	public isRequest() {
		return this.response === null;
	}
	public isResponse() {
		return this.response !== null;
	}

	public request: IncomingRequest;
	public requestHeaders: IncomingRequest['headers'];
	public scheme: string;
	public targetUri: string;
	public url: URL;
	public requestSignatureInput: SFVSignatureInputDictionary | undefined;
	public responseSignatureInput: SFVSignatureInputDictionary | undefined;
	constructor(
		source: IncomingRequest | OutgoingResponse,
		/**
		 * Must be signature params of the request
		 */
		requestSignatureParams?: SFVSignatureInputDictionaryForInput | string,
		scheme: string = 'https',
		additionalSfvTypeDictionary: SFVHeaderTypeDictionary = {},
		/**
		 * Set if provided object is response
		 */
		responseSignatureParams?: SFVSignatureInputDictionaryForInput | string,
	) {
		this.sfvTypeDictionary = { ...sfvHeaderTypeDictionaryIKnow, ...additionalSfvTypeDictionary };

		if ('req' in source) {
			this.response = source;
			this.request = source.req;
		} else {
			this.response = null;
			this.request = source;
		}

		if (!this.request.url) {
			throw new Error('Request URL is empty');
		}
		if (!this.request.method) {
			throw new Error('Request method is empty');
		}

		this.requestSignatureInput = typeof requestSignatureParams === 'string' ?
			sh.parseDictionary(requestSignatureParams) as SFVSignatureInputDictionary
			: (requestSignatureParams && RFC9421SignatureBaseFactory.inputSignatureParamsDictionary(requestSignatureParams));
		if (this.isRequest() && !this.requestSignatureInput) {
			throw new Error('requestSignatureParams is not provided');
		}
		this.responseSignatureInput = typeof responseSignatureParams === 'string' ?
			sh.parseDictionary(responseSignatureParams) as SFVSignatureInputDictionary
			: (responseSignatureParams && RFC9421SignatureBaseFactory.inputSignatureParamsDictionary(responseSignatureParams));
		if (this.isResponse() && !this.responseSignatureInput) {
			throw new Error('responseSignatureParams is not provided');
		}

		this.requestHeaders = lcObjectKey(('headersDistinct' in this.request && this.request.headersDistinct) ? this.request.headersDistinct : this.request.headers);

		this.sfvTypeDictionary = lcObjectKey(additionalSfvTypeDictionary);

		this.scheme = this.request.url.startsWith('/') ? scheme : new URL(this.request.url).protocol.replace(':', '');
		const rawHost = this.request.httpVersionMajor === 2 ? this.requestHeaders[':authority'] : this.requestHeaders['host'];
		if (!rawHost) throw new Error('Host header is empty');
		const host = canonicalizeHeaderValue(rawHost);
		this.targetUri = this.request.url.startsWith('/') ? (new URL(this.request.url, `${scheme}://${host}`)).href : this.request.url;
		this.url = new URL(this.targetUri);
	}

	static inputSignatureParamsDictionary(input: SFVSignatureInputDictionaryForInput): SFVSignatureInputDictionary {
		const output = getMap(input) as unknown as SFVSignatureInputDictionary;
		for (const [label, item] of output) {
			if (Array.isArray(item)) {
				const [components, params] = item;
				for (let i = 0; i < components.length; i++) {
					components[i][1] = getMap(components[i][1]);
				}
				output.set(label, [components, getMap(params)]);
			}
		}
		return output;
	}

	public get(
		name: '@query-param',
		paramsLike?: MapLike<'name', string>,
	): string
	public get(
		name: string,
		paramsLike?: MapLike<'req' | 'key', string> | MapLike<'sf' | 'bs' | 'tr', boolean>,
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
			}
			throw new Error(`Invalid component type string: ${componentIdentifier}`);
		}

		if (this.isResponse() && params.get('req') !== true && availableDerivedComponents.includes(name as any)) {
			throw new Error(`component is not available in response (must use with ;req, or provided object is unintentionally treated as response (existing req prop.)): ${name}`);
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

			const rawValue: string | number | string[] | undefined = (() => {
				if (isReq) {
					if (isTr) {
						return ('trailers' in this.request && this.request.trailers) ? getLc(this.request.trailers, name) : this.requestHeaders[name];
					} else {
						return this.requestHeaders[name];
					}
				} else {
					if (!this.response) throw new Error('response is not provided');
					const getHeaderValue = (name: string) => {
						if (!this.response) throw new Error('response is not provided');
						if ('getHeaders' in this.response && typeof this.response.getHeader === 'function') {
							return this.response.getHeaders()[name];
						} else if ('getHeader' in this.response && typeof this.response.getHeader === 'function') {
							return this.response.getHeader(name);
						} else if ('headers' in this.response && this.response.headers) {
							return getLc(this.response.headers, name);
						}
						throw new Error('cannot get header value from response object');
					};
					if (isTr) {
						return ('trailers' in this.response && this.response.trailers) ? getLc(this.response.trailers, name) : getHeaderValue(name);
					} else {
						return getHeaderValue(name);
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
				} else if (this.sfvTypeDictionary[name] === 'item') {
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
					.map(x => canonicalizeHeaderValue(x))
					.map(x => (new TextEncoder()).encode(x))
					.map(x => encodeArrayBufferToBase64(x.buffer))
					.map(x => new sh.ByteSequence(x))
					.map(x => [x, new Map()] as sh.Item);
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
				}
				throw new Error(`Invalid component identifier name: ${name}`);
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
