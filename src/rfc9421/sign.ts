
// TODO

import { canonicalizeHeaderValue, encodeArrayBufferToBase64, getLc, lcObjectKey } from "../utils";
import { IncomingOrOutgoing, IncomingRequest, OutgoingResponse } from "../types";
import * as sh from "structured-headers";

/**
 * Structured Field Value Type Dictionary
 * https://datatracker.ietf.org/doc/html/rfc8941
 *
 * key: field (header) name
 * value: item, list, dict
 */
export type SFVTypeDictionary = Record<string, 'item' | 'list' | 'dict'>

/**
 * Class for creating signature base,
 * construct with a request or a response
 */
export class RFC9421SignatureBaseFactory {
	public static availableDerivedComponents: [
		'@signature-params',
		'@method',
		'@authority',
		'@scheme',
		'@target-uri',
		'@request-target',
		'@path',
		'@query',
	];

	public sfvTypeDictionary: SFVTypeDictionary;
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
	constructor(
		source: IncomingOrOutgoing,
		/**
		 * Must be signature params of the request
		 */
		public requestSignatureParams?: string,
		scheme: string = 'https',
		sfvTypeDictionary: SFVTypeDictionary = {},
		/**
		 * Set if provided object is response
		 */
		public responseSignatureParams?: string,
	) {
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

		this.requestHeaders = lcObjectKey(('headersDistinct' in this.request && this.request.headersDistinct) ? this.request.headersDistinct : this.request.headers);

		this.sfvTypeDictionary = lcObjectKey(sfvTypeDictionary);

		this.scheme = this.request.url.startsWith('/') ? scheme : new URL(this.request.url).protocol.replace(':', '');
		const rawHost = this.request.httpVersionMajor === 2 ? this.requestHeaders[':authority'] : this.requestHeaders['host'];
		if (!rawHost) throw new Error('Host header is empty');
		const host = canonicalizeHeaderValue(rawHost);
		this.targetUri = this.request.url.startsWith('/') ? (new URL(this.request.url, `${scheme}://${host}`)).href : this.request.url;
		this.url = new URL(this.targetUri);
	}

	/**
	 * Return component value from component type and parameters
	 * @param componentIdentifier e.g. '"@query-param";name="foo"', '@method', 'content-digest'
	 * @returns component value
	 */
	public get(
		componentIdentifier: string,
	): string {
		const params = componentIdentifier.split(';');
		let name = params[0];
		if (!name) {
			throw new Error(`Type is empty: ${componentIdentifier}`);
		}
		if (name.startsWith('"')) {
			if (name.endsWith('"')) {
				name = name.slice(1, -1);
			}
			throw new Error(`Invalid component type string: ${componentIdentifier}`);
		}

		if (this.isResponse() && RFC9421SignatureBaseFactory.availableDerivedComponents.includes(name as any)) {
			if (name !== '@signature-params') {
				throw new Error(`component is not available in response (must use with ;req, or provided object is unintentionally treated as response (existing req prop.)): ${name}`);
			}
		}

		const isReq = this.isRequest() || params.includes('req'); // Request

		if (isReq && this.isRequest()) {
			throw new Error('req param is not available in request (provided object is treated as request, please set req param with Request)');
		}

		if (name === '@signature-params') {
			if (isReq) {
				if (!this.requestSignatureParams) {
					throw new Error('requestSignatureParams is not provided');
				}
				return this.requestSignatureParams;
			} else {
				if (!this.responseSignatureParams) {
					throw new Error('signatureParams is not provided');
				}
				return this.responseSignatureParams;
			}
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
			const key = params.find(x => x.startsWith('name="') && x.endsWith('"'))?.slice(6, -1);
			if (!key) {
				throw new Error('Query parameter name not found or invalid');
			}
			const value = this.url.searchParams.get(key);
			if (value === null) {
				throw new Error(`Query parameter not found: ${key}`);
			}
			return value;
		} else if (name.startsWith('@')) {
			throw new Error(`Unknown derived component: ${name}`);
		} else {
			// https://datatracker.ietf.org/doc/html/rfc9421#section-2.1
			const keyParam = params.find(x => x.startsWith('key="'));
			const isSf = params.includes('sf'); // Structed Field
			const isBs = params.includes('bs'); // Binary-Wrapped
			const isTr = params.includes('tr'); // Trailer

			if (isSf && isBs) {
				throw new Error(`Invalid component: ${componentIdentifier} (sf and bs cannot be used together)`);
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

			if (keyParam) {
				// https://datatracker.ietf.org/doc/html/rfc9421#name-dictionary-structured-field
				if (!(name in this.sfvTypeDictionary)) {
					throw new Error(`key specified but type unknown (Type not found in SFV type dictionary): ${componentIdentifier}`);
				}
				if (!keyParam.endsWith('"')) {
					throw new Error(`Invalid key param: ${params.join(';')}`);
				}
				if (typeof rawValue !== 'string') {
					throw new Error(`Key specified but value is not a string: ${componentIdentifier}`);
				}
				const key = keyParam.slice(5, -1);
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
}

export function genRFC9421SignatureBase(
	/**
	 * Request or response to sign
	 */
	requestOrResponse: IncomingOrOutgoing,

	/**
	 * Components to include in the signature string
	 *
	 * @examples
	 * ```
	 * [
	 * 	'@method', // derived component
	 *	'content-digest', // header
	 *	'"content-digest";req' // req
	 *  '"@query-param";name="foo"' // query param
	 * ]
	 * ```
	 */
	includeComponents: string[],
	data?: {
		signatureParams?: string;
		requestSignatureParams?: string;
		/**
		 * Fallback scheme, e.g. 'https'
		 */
		scheme?: string;
		sfvTypeDictionary?: SFVTypeDictionary;
	},
) {
	const factory = new RFC9421SignatureBaseFactory(requestOrResponse, data?.signatureParams, data?.scheme, data?.sfvTypeDictionary);

	const results = new Map<string, string>();
	const push = (key: string, value = '') => {
		if (results.has(key)) {
			throw new Error(`Duplicate key: ${key}`);
		}

		if (key.startsWith('"')) {
			results.set(key, value);
		} else {
			results.set(`"${key}"`, value ?? factory.get(key));
		}
	};

	for (const componentIdentifier of includeComponents.map(x => x.toLowerCase())) {
		const params = componentIdentifier.split(';');
		if (!params[0]) {
			throw new Error('Component identifier is empty');
		}
		push(params[0], factory.get(componentIdentifier));
	}

	return Array.from(results.entries(), ([key, value]) => `${key}: ${value}`).join('\n');
}
