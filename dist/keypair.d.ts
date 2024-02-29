/// <reference types="node" />
export declare function genRsaKeyPair(modulusLength?: number): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export type EcCurves = 'prime256v1' | 'secp384r1' | 'secp521r1' | 'secp256k1';
export declare function genEcKeyPair(namedCurve?: EcCurves): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd25519KeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd448KeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
}>;
/**
 * PKCS1形式かもしれない公開キーをSPKI形式に統一して出力する
 */
export declare function toSpkiPublicKey(publicKey: string): string | Buffer;
