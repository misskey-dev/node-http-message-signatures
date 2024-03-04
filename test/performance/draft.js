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
	request.headers['Digest'] = await genRFC3230DigestHeader(request.body, 'SHA-256');

	/**
	 * RSA4096, SHA-256
	 */
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: rsa4096.privateKey }, basicIncludeHeaders, { hashAlgorithm: 'SHA-256' });
		}
		logPerf('web Sign RSA4096, SHA-256', process.hrtime(start));
	}
	{
		let cnt = 0;
		const start = process.hrtime();
		await Promise.all(
			Array(TRYES).fill().map(() =>
				signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: rsa4096.privateKey }, basicIncludeHeaders, { hashAlgorithm: 'SHA-256' })
					.then(() => cnt++))
		);
		logPerf('web(Promise.all) Sign RSA4096, SHA-256', process.hrtime(start));
		if (cnt !== TRYES) throw new Error('failed');
	}

	/**
	 * Ed25519
	 */
	{
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: ed25519.privateKey }, basicIncludeHeaders, { hashAlgorithm: null });
		}
		logPerf('web Sign Ed25519', process.hrtime(start));
	}
	{
		let cnt = 0;
		const start = process.hrtime();
		await Promise.all(
			Array(TRYES).fill().map(() =>
				signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: ed25519.privateKey }, basicIncludeHeaders, { hashAlgorithm: null })
					.then(() => cnt++))
		);
		logPerf('web(Promise.all) Sign Ed25519', process.hrtime(start));
		if (cnt !== TRYES) throw new Error('failed');
	}
}

/**
 * Verify RSA4096, SHA-256
 */
{
	const request = getBasicOutgoingRequest();
	request.headers['Digest'] = await genRFC3230DigestHeader(request.body, 'SHA-256');
	await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: rsa4096.privateKey }, basicIncludeHeaders, { hashAlgorithm: 'SHA-256' });
	const parsed = parseRequestSignature(request);

	{
		const testCase = 'web Verify RSA4096, SHA-256';
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = await verifyDraftSignature(parsed.value, rsa4096.publicKey);
			if (verifyResult !== true) {
				throw new Error(`failed: ${testCase}`);
			}
		}
		logPerf(testCase, process.hrtime(start));
	}
	{
		const testCase = 'web(Promise.all) Verify RSA4096, SHA-256';
		let cnt = 0;
		const start = process.hrtime();
		await Promise.all(Array(TRYES).fill().map(() =>
			verifyDraftSignature(parsed.value, rsa4096.publicKey)
				.then(r => r ? true : Promise.reject(new Error('failed')))
				.then(() => cnt++)));
		logPerf(testCase, process.hrtime(start));
		if (cnt !== TRYES) throw new Error('failed');
	}

	request.headers = lcObjectKey(request.headers);
	const parsedJ = httpSignature.parseRequest(request);
	{
		const testCase = 'Joyent Verify RSA4096, SHA-256';
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = httpSignature.verifySignature(parsedJ, rsa4096.publicKey);
			if (verifyResult !== true) {
				throw new Error(`failed: ${testCase}`);
			}
		}
		logPerf(testCase, process.hrtime(start));
	}
}

/**
 * Verify Ed25519
 */
{
	const request = getBasicOutgoingRequest();
	request.headers['Digest'] = await genRFC3230DigestHeader(request.body, 'SHA-256');
	await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: ed25519.privateKey }, basicIncludeHeaders, { hashAlgorithm: null });
	const parsed = parseRequestSignature(request);

	{
		const testCase = 'web Verify Ed25519';
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = await verifyDraftSignature(parsed.value, ed25519.publicKey);
			if (verifyResult !== true) {
				throw new Error(`failed: ${testCase}`);
			}
		}
		const end = performance.now();
		logPerf(testCase, process.hrtime(start));
	}
	{
		const testCase = 'web(Promise.all) Verify Ed25519';
		let cnt = 0;
		const start = process.hrtime();
		await Promise.all(Array(TRYES).fill().map(() =>
			verifyDraftSignature(parsed.value, ed25519.publicKey)
				.then(r => r ? true : Promise.reject(new Error('failed')))
				.then(() => cnt++)));
		logPerf(testCase, process.hrtime(start));
		if (cnt !== TRYES) throw new Error('failed');
	}

	request.headers = lcObjectKey(request.headers);
	const parsedJ = httpSignature.parseRequest(request);
	{
		const testCase = 'Joyent Verify Ed25519';
		const start = process.hrtime();
		for (let i = 0; i < TRYES; i++) {
			const verifyResult = httpSignature.verifySignature(parsedJ, ed25519.publicKey);
			if (verifyResult !== true) {
				throw new Error(`failed: ${testCase}`);
			}
		}
		const end = performance.now();
		logPerf(testCase, process.hrtime(start));
	}
}
