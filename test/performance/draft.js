import { signAsDraftToRequest, parseRequestSignature, genRFC3230DigestHeader, verifyDraftSignature, lcObjectKey } from '../../dist/index.mjs';
import { rsa4096, ed25519 } from '../keys.js';
import httpSignature from '@peertube/http-signature';

const TRYES = 1600;

const getBasicOutgoingRequest = () => ({
	headers: {
		Date: (new Date()).toUTCString(),
		Host: 'example.com',
		Accept: '*/*',
	},
	method: 'POST',
	url: '/foo/bar',
	body: '{"@context":["https://www.w3.org/ns/activitystreams","https://w3id.org/security/v1",{"Key":"sec:Key","manuallyApprovesFollowers":"as:manuallyApprovesFollowers","sensitive":"as:sensitive","Hashtag":"as:Hashtag","quoteUrl":"as:quoteUrl","toot":"http://joinmastodon.org/ns#","Emoji":"toot:Emoji","featured":"toot:featured","discoverable":"toot:discoverable","schema":"http://schema.org#","PropertyValue":"schema:PropertyValue","value":"schema:value","misskey":"https://misskey-hub.net/ns#","_misskey_content":"misskey:_misskey_content","_misskey_quote":"misskey:_misskey_quote","_misskey_reaction":"misskey:_misskey_reaction","_misskey_votes":"misskey:_misskey_votes","_misskey_summary":"misskey:_misskey_summary","isCat":"misskey:isCat","vcard":"http://www.w3.org/2006/vcard/ns#"}],"id":"https://misskey.io/notes/9qarnku54zbc0b9u","type":"Note","attributedTo":"https://misskey.io/users/7rkrarq81i","content":"<p>アライグマ vs ダライラマ</p>","published":"2024-02-29T12:28:49.085Z","to":["https://www.w3.org/ns/activitystreams#Public"],"cc":["https://misskey.io/users/7rkrarq81i/followers"],"inReplyTo":null,"attachment":[],"sensitive":false,"tag":[]}',
});

const basicIncludeHeaders = ['(request-target)', 'host', 'date', 'digest'];

function round3(value) {
	const pow = Math.pow(10, 3);
	return Math.round(value * pow) / pow;
}

/**
 * @param {string} name
 * @param {[number, number]} diff
 */
function logPerf(name, diff) {
	const ms = diff[0] * 1e3 + diff[1] / 1e6;
	console.log(name, '\n', round3(ms), 'ms', round3(TRYES / (ms / 1e3)), 'ops/s');
}

console.log('Performance test, TRYES:', TRYES);

/**
 * Sign
 */
{
	const request = getBasicOutgoingRequest();
	request.headers['Digest'] = genRFC3230DigestHeader(request.body, 'sha256');

	/**
	 * RSA4096, SHA-256
	 */
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: rsa4096.privateKey }, basicIncludeHeaders, { hashAlgorithm: 'sha256' });
		}
		logPerf('Sign RSA4096, SHA-256', process.hrtime(start));
	}

	/**
	 * Ed25519
	 */
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: ed25519.privateKey }, basicIncludeHeaders, { hashAlgorithm: null });
		}
		logPerf('Sign Ed25519', process.hrtime(start));
	}
}

/**
 * Verify RSA4096, SHA-256
 */
{
	const request = getBasicOutgoingRequest();
	request.headers['Digest'] = genRFC3230DigestHeader(request.body, 'sha256');
	signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: rsa4096.privateKey }, basicIncludeHeaders, { hashAlgorithm: 'sha256' });
	const parsed = parseRequestSignature(request);

	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = verifyDraftSignature(parsed.value, rsa4096.publicKey);
		}
		logPerf('misskey-dev Verify RSA4096, SHA-256', process.hrtime(start));
	}

	request.headers = lcObjectKey(request.headers);
	const parsedJ = httpSignature.parseRequest(request);
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = httpSignature.verifySignature(parsedJ, rsa4096.publicKey);
		}
		logPerf('Joyent Verify RSA4096, SHA-256', process.hrtime(start));
	}
}

/**
 * Verify Ed25519
 */
{
	const request = getBasicOutgoingRequest();
	request.headers['Digest'] = genRFC3230DigestHeader(request.body, 'sha256');
	signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: ed25519.privateKey }, basicIncludeHeaders, { hashAlgorithm: null });
	const parsed = parseRequestSignature(request);

	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = verifyDraftSignature(parsed.value, ed25519.publicKey);
		}
		logPerf('misskey-dev Verify Ed25519', process.hrtime(start));
	}

	request.headers = lcObjectKey(request.headers);
	const parsedJ = httpSignature.parseRequest(request);
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = httpSignature.verifySignature(parsedJ, ed25519.publicKey);
		}
		const end = performance.now();
		logPerf('Joyent Verify Ed25519', process.hrtime(start));
	}
}
