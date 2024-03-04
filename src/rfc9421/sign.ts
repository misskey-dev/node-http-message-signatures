
// TODO

import { RequestLike } from "../types";
import { lcObjectKey } from "../utils";

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

	public get(
		type: typeof RFC9421SignatureBaseFactory.availableDerivedComponents[number] | string,
	): string {
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
		} else if (type.startsWith('@')) {
			throw new Error(`Unknown derived component: ${type}`);
		} else if (type === 'date' && !this.headers['date'] && this.headers['x-date']) {
			return this.headers['x-date'];
		} else {
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

	const results = [] as string[];
	const push = (key: string, value?: string) => {
		results.push(`"${key}": ${value ?? ''}`);
	};

	for (const _key of includeComponents.map(x => x.toLowerCase())) {
		let key = _key;
		if (key.startsWith('"') && key.endsWith('"')) {
			key = key.slice(1, -1);
		} else if (key.startsWith('"') && key.endsWith('";req')) {
			if (!requestFactory) {
				throw new Error('request is required for `;req`');
			}
			// req
			key = key.slice(1, -5);
			push(key, requestFactory.get(key));
			continue;
		}

		if (key.startsWith('"@query-param";name="')) {
		} else {
			push(key, factory.get(key));
		}
	}

	return results.join('\n');
}
