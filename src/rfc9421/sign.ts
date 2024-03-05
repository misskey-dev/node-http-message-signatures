
// TODO

import { RequestLike } from "../types";
import { lcObjectKey } from "../utils";

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

	public headers: Record<string, string>;
	public scheme: string;
	public targetUri: string;
	public url: URL;
	constructor(
		public request: RequestLike,
		public signatureParams?: string,
		scheme: string = 'https',
	) {
		this.headers = lcObjectKey(request.headers);

		this.scheme = request.url.startsWith('/') ? scheme : new URL(request.url).protocol.replace(':', '');
		this.targetUri = request.url.startsWith('/') ? (new URL(request.url, `${scheme}://${this.headers.host}`)).href : request.url;
		this.url = new URL(this.targetUri);
	}

	/**
	 * Return component value from component type and parameters
	 * @param component e.g. '"@query-param";name="foo"', '@method', 'content-digest'
	 * @returns component value
	 */
	public get(
		component: string,
	): string {
		const params = component.split(';');
		let type = params[0];
		if (!type) {
			throw new Error(`Type is empty: ${component}`);
		}
		if (type.startsWith('"')) {
			if (type.endsWith('"')) {
				type = type.slice(1, -1);
			}
			throw new Error(`Invalid component type string: ${component}`);
		}

		if (type === '@signature-params') {
			if (!this.signatureParams) {
				throw new Error('signatureParams is not provided');
			}
			return this.signatureParams;
		} else if (type === '@method') {
			return this.request.method.toUpperCase();
		} else if (type === '@authority') {
			return this.url.host;
		} else if (type === '@scheme') {
			return this.scheme.toLocaleLowerCase();
		}	else if (type === '@target-uri') {
			return this.targetUri;
		} else if (type === '@request-target') {
			return `${this.request.method.toLowerCase()} ${this.url.pathname}`;
		} else if (type === '@path') {
			return this.url.pathname;
		} else if (type === '@query') {
			return this.url.search;
		} else if (type === '@query-param') {
			const key = params.find(x => x.startsWith('name="') && x.endsWith('"'))?.slice(6, -1);
			if (!key) {
				throw new Error('Query parameter name not found or invalid');
			}
			const value = this.url.searchParams.get(key);
			if (value === null) {
				throw new Error(`Query parameter not found: ${key}`);
			}
			return value;
		} else if (type.startsWith('@')) {
			throw new Error(`Unknown derived component: ${type}`);
		} else if (type === 'date' && !this.headers['date'] && this.headers['x-date']) {
			return this.headers['x-date'];
		} else {
			// WIP
			// https://datatracker.ietf.org/doc/html/rfc9421#section-2.1
			const keyParam = params.find(x => x.startsWith('key="'));
			const isSf = params.includes('sf'); // Structed Field
			const isBs = params.includes('bs'); // Binary-Wrapped
			const isTr = params.includes('tr'); // Trailer
			if (keyParam) {
				if (!keyParam.endsWith('"')) {
					throw new Error(`Invalid key param: ${params.join(';')}`);
				}
			}

			return this.headers[type];
		}
	}
}

export function genRFC9421SignatureBase(
	/**
	 * Request or response to sign
	 */
	requestOrResponse: RequestLike,

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
		req?: RequestLike;
		signatureParams?: string;
		scheme?: string;
	},
) {
	const factory = new RFC9421SignatureBaseFactory(requestOrResponse, data?.signatureParams, data?.scheme);
	const requestFactory = data?.req ? new RFC9421SignatureBaseFactory(data?.req, data?.scheme) : null;

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

	for (const component of includeComponents.map(x => x.toLowerCase())) {
		const params = component.split(';');
		if (!params[0]) {
			throw new Error('Component is empty');
		}
		const currentFactory = params.includes('req') ? factory : requestFactory;
		if (!currentFactory) {
			throw new Error('You request req component but req is not provided');
		}

		push(params[0], currentFactory.get(component));
	}

	return Array.from(results.entries(), ([key, value]) => `${key}: ${value}`).join('\n');
}
