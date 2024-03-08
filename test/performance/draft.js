import { signAsDraftToRequest, parseRequestSignature, genRFC3230DigestHeader, verifyDraftSignature, importPrivateKey, importPublicKey, collectHeaders } from '../../dist/index.mjs';
import { rsa4096, prime256v1, ed25519, ed448 } from '../keys.js';
import httpSignature from '@peertube/http-signature';
import { PerformanceBase } from './base.js';

const test = new PerformanceBase(1600);

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

for (const [type, keypair] of [['rsa4096', rsa4096], ['prime256v1', prime256v1], ['ed25519', ed25519], ['ed448', ed448]]) {
	/**
	 * importPrivateKey
	 */
	{
		test.start(`${type} web importPrivateKey`);
		for (let i = 0; i < test.TRYES; i++) {
			await importPrivateKey(keypair.privateKey, ['sign']);
		}
		test.end();
	}
	/**
	 * importPublicKey
	 */
	{
		test.start(`${type} web importPublicKey`);
		for (let i = 0; i < test.TRYES; i++) {
			await importPublicKey(keypair.publicKey, ['verify']);
		}
		test.end();
	}

	/**
	 * Sign
	 */
	{
		const request = getBasicOutgoingRequest();
		request.headers['Digest'] = await genRFC3230DigestHeader(request.body, 'SHA-256');

		{
			test.start(`${type} web(for loop) Sign (default is SHA-256)`);
			for (let i = 0; i < test.TRYES; i++) {
				await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: keypair.privateKey }, basicIncludeHeaders);
			}
			test.end();
		}
		{
			let cnt = 0;
			test.start(`${type} web(Promise.all) Sign (default is SHA-256)`);
			await Promise.all(
				Array(test.TRYES).fill().map(() =>
					signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: keypair.privateKey }, basicIncludeHeaders)
						.then(() => cnt++))
			);
			test.end();
			if (cnt !== test.TRYES) throw new Error('failed');
		}
	}

	/**
	 * Verify RSA4096, SHA-256
	 */
	{
		const request = getBasicOutgoingRequest();
		request.headers['Digest'] = await genRFC3230DigestHeader(request.body, 'SHA-256');
		await signAsDraftToRequest(request, { keyId: 'test', privateKeyPem: keypair.privateKey }, basicIncludeHeaders);
		const parsed = parseRequestSignature(request);

		{
			const testCase = `${type} web(for loop) Verify (default is SHA-256)`;
			const errorLogger = (...args) => { console.error(...args) };
			test.start(testCase);
			for (let i = 0; i < test.TRYES; i++) {
				const verifyResult = await verifyDraftSignature(parsed.value, keypair.publicKey, errorLogger);
				if (verifyResult !== true) {
					throw new Error(`failed: ${testCase}`);
				}
			}
			test.end();
		}
		{
			const testCase = `${type} web(Promise.all) Verify (default is SHA-256)`;
			let cnt = 0;
			const errorLogger = (...args) => { console.error(...args) };
			test.start(testCase);
			await Promise.all(Array(test.TRYES).fill().map(() =>
				verifyDraftSignature(parsed.value, keypair.publicKey, errorLogger)
					.then(r => r === true ? true : Promise.reject(new Error('failed')), e => Promise.reject(e))
					.then(() => cnt++)));
			test.end();
			if (cnt !== test.TRYES) throw new Error('failed');
		}

		request.headers = collectHeaders(request);
		if (type !== 'prime256v1' && type !== 'ed448') {
			const parsedJ = httpSignature.parseRequest(request);
			const testCase = `${type} Joyent Verify (default is SHA-256)`;
			test.start(testCase);
			for (let i = 0; i < test.TRYES; i++) {
				const verifyResult = httpSignature.verifySignature(parsedJ, keypair.publicKey);
				if (verifyResult !== true) {
					throw new Error(`failed: ${testCase}`);
				}
			}
			test.end();
		}
	}
}
