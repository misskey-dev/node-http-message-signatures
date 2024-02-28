import * as crypto from 'crypto';
import type { SignatureHashAlgorithm } from '@/types.js';

/**
 * ヘッダーのアルゴリズムから鍵とハッシュアルゴリズムを認識する
 * 提供されたアルゴリズムと呼び出しの公開鍵の種類が一致しない場合はエラーを投げる
 * @param algorithm ヘッダーのアルゴリズム
 * @param key 実際の公開鍵
 */
export function detectAndVerifyAlgorithm(algorithm: string | undefined, publicKey: crypto.KeyObject ): { keyAlg: crypto.KeyType, hashAlg: SignatureHashAlgorithm | null } {
	algorithm = algorithm?.toLowerCase();
	const realKeyType = publicKey.asymmetricKeyType;

	if (algorithm && algorithm !== 'hs2019' && realKeyType) {
		const providedKeyAlgorithm = algorithm.split('-')[0];
		if (
			providedKeyAlgorithm[0] !== realKeyType.toLowerCase() &&
			!(providedKeyAlgorithm === 'ecdsa' && realKeyType === 'ec')
		) {
			throw new Error('Provided algorithm does not match the public key type');
		}
	}

	// ed25519
	if (algorithm === 'ed25519' || algorithm === 'ed25519-sha512' || realKeyType === 'ed25519') {	// ed25519-sha512 はjoyent実装が使うかも
		return { keyAlg: 'ed25519', hashAlg: null }; // ハッシュ関数は固定
	}

	// ed448
	if (algorithm === 'ed448' || realKeyType === 'ed448') {
		return { keyAlg: 'ed448', hashAlg: null }; // ハッシュ関数は固定
	}

	// RFC 9421
	if (algorithm === 'rsa-v1_5-sha256') return { keyAlg: 'rsa', hashAlg: 'sha256' };
	if (algorithm === 'ecdsa-p256-sha256') return { keyAlg: 'ec', hashAlg: 'sha256' };
	if (algorithm === 'ecdsa-p384-sha384') return { keyAlg: 'ec', hashAlg: 'sha384' };

	// rsa, ecdsa
	const m = algorithm?.match(/^(rsa|ecdsa)-(sha(?:256|384|512))$/);
	if (m) {
		return {
			keyAlg: m[1] === 'ecdsa' ? 'ec' : 'rsa',
			hashAlg: m[2] as SignatureHashAlgorithm,
		};
	}

	// バグ (Crystal版pub-relay) や 中途仕様のhs2019を実装したもののため
	if (realKeyType === 'rsa' || realKeyType === 'ec') {
		return { keyAlg: realKeyType, hashAlg: 'sha256' };
	} else if (realKeyType) {
		return { keyAlg: realKeyType, hashAlg: null };
	} else if (algorithm && algorithm !== 'hs2019') {
		const algoSplitted = algorithm.split('-');
		return {
			keyAlg: algoSplitted[0] as crypto.KeyType,
			hashAlg: algoSplitted.length === 1 ? null : algoSplitted[algoSplitted.length - 1] as SignatureHashAlgorithm,
		};
	}
	throw new Error('Algorithm not found');
}
