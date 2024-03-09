import { parseSingleRFC9421Signature } from './parse';
import { RFC9421SignatureBaseFactory } from './sign';
import * as sh from 'structured-headers';

const request = {
	headers: {
		'host': 'example.com',
		'date': 'Tue, 20 Apr 2021 02:07:55 GMT',
		'content-digest': 'sha-256=base64',
		'signature-input': 'sig1=("@method" "date");keyid="x";alg="rsa-v1_5-sha256";created=1618884475'
	},
	url: '/foo',
	method: 'POST',
};

describe(parseSingleRFC9421Signature, () => {
	test('normal', () => {
		const factory = new RFC9421SignatureBaseFactory(
			request,
		);
		const input = sh.parseDictionary(request.headers['signature-input']!);
		const signature = 'aaa';
		const result = parseSingleRFC9421Signature('sig1', factory, input.get('sig1') as any, new sh.ByteSequence(signature));
		expect(result).toStrictEqual({
			algorithm: 'rsa-v1_5-sha256',
			base: factory.generate('sig1'),
			created: 1618884475,
			expires: undefined,
			keyid: 'x',
			nonce: undefined,
			params: `("@method" "date");keyid="x";alg="rsa-v1_5-sha256";created=1618884475`,
			signature: 'aaa',
			tag: undefined,
		});
	});
});
