/**
import * as kp from '@/keypair.js';

describe('a', () => {
	test('a', async () => {
		console.log(await kp.genRsaKeyPair(4096));
		console.log(await kp.genEcKeyPair());
		console.log(await kp.genEd25519KeyPair());
		console.log(await kp.genEd448KeyPair());

		expect(1).toBe(1);
	});
});
*/

export const rsa4096 = {
	publicKey: '-----BEGIN PUBLIC KEY-----\n' +
		'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEArzgdkSKRSGiTxtdB/QP6\n' +
		'VoyukDpItrfKTY8oMn1ULsUyyHLhkqnFspJIZKZSGih2VwOmSs/ZNxOyCotg2QxT\n' +
		'Zt68ClIbKujh/wBLfaRH+A4ifE2+/7b0ewJs11DAHVOvWOpyNbuIpjLnPplkrf6B\n' +
		'WI8TrMAvtYCWfCFwGcwZRe94pB46kgd+fCzbO9CeYudmrhcKGR4a/gD73askDC9E\n' +
		'62fuws+3NA1GS508OlyE/vYyIzjb628CmlrdSdVA3y6yYge1mqAWWxCeaPQiC+Vn\n' +
		'4ARd7+gWtwQX0Tn4ZDDk36Q9OWTIOWGR6RF5rI4GTYsgbIo394xI/YGbDLkv4oYF\n' +
		'gsJqldj+LNE5CbfTN4mLSLzu9zaIybkBlXuopeeUtc6rh0/yEJVpbzT5b5klicPP\n' +
		'6w7JfQGWg6NS81QY8OiSRCV39Encq9SJjfyuQETuL+zewf1XMalqoegNYQlCDpjz\n' +
		'WUfxkrHLLAaZaa1Pnd9TbYEKxfCSXJIeqV3LZH/FGf6glTxVu/hyrUyjtpvBnAkP\n' +
		'RtEw1i4sC+2dFTru4wLZe8Tg1ResycT0vsdtjjVKm1pAx6hx7lK9hf+zJR3Rj04N\n' +
		'K9EBKmp+9Yb0g0mfPe2keIz/mC1QpAuaFRbChoM5ClGdz4sMaETr+sehSD9F0M7A\n' +
		'pd7xE5wVm2/pklBs3bjfY0MCAwEAAQ==\n' +
		'-----END PUBLIC KEY-----\n',
	privateKey: '-----BEGIN PRIVATE KEY-----\n' +
		'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\n' +
		'YUafQ5UdToVC3xNqYIekHYJku4vqhg==\n' +
		'-----END PRIVATE KEY-----\n'
};

export const prime256v1 = {
	publicKey: '-----BEGIN PUBLIC KEY-----\n' +
		'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgKU5EgiR8Tl1MxX1LvVHIkk+/hj8\n' +
		'aUFVZB7voaaypnO2nCQ+qkfuFLDZ8n1W4AbI9GEK7cw2Ibtl42hjrSJWUQ==\n' +
		'-----END PUBLIC KEY-----\n',
	privateKey: '-----BEGIN PRIVATE KEY-----\n' +
		'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgyj2aQK/BOqGfpsc0\n' +
		'1rDeYN0h/VyZpQn/4Da1ZUO+ikahRANCAASApTkSCJHxOXUzFfUu9UciST7+GPxp\n' +
		'QVVkHu+hprKmc7acJD6qR+4UsNnyfVbgBsj0YQrtzDYhu2XjaGOtIlZR\n' +
		'-----END PRIVATE KEY-----\n'
};

export const ed25519 = {
	publicKey: '-----BEGIN PUBLIC KEY-----\n' +
		'MCowBQYDK2VwAyEA+Wv6/Aarbcb9UOC5ANIzinhZjxIAwiS5fpeRYEKjYFg=\n' +
		'-----END PUBLIC KEY-----\n',
	privateKey: '-----BEGIN PRIVATE KEY-----\n' +
		'MC4CAQAwBQYDK2VwBCIEIPC3Lb2/bqCxAsUnMR/TQ0DmXRhLL96b9uq0HFIc1UDm\n' +
		'-----END PRIVATE KEY-----\n'
};

export const ed448 = {
	publicKey: '-----BEGIN PUBLIC KEY-----\n' +
		'MEMwBQYDK2VxAzoA154RiOTzwzVQDwsUR48lHtZHLSDkoZHTT6ouHUXemfo777IP\n' +
		'84oqJ57FQS2lR9jKSDIWyI2Xc+kA\n' +
		'-----END PUBLIC KEY-----\n',
	privateKey: '-----BEGIN PRIVATE KEY-----\n' +
		'MEcCAQAwBQYDK2VxBDsEOY5KmuZce4DkJ0S0n/tEUVpSsN5O6a7wnhBwgKqyNj/1\n' +
		'uTmKpnPO/E0oHR5Pyr3j2JtEev8+rHivZA==\n' +
		'-----END PRIVATE KEY-----\n'
};
