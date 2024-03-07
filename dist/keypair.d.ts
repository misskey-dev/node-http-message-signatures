import type { ECNamedCurve } from './types';
export declare function exportPublicKeyPem(key: CryptoKey): Promise<string>;
export declare function exportPrivateKeyPem(key: CryptoKey): Promise<string>;
export declare function genRsaKeyPair(modulusLength?: number, keyUsage?: KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEcKeyPair(namedCurve?: ECNamedCurve, keyUsage?: KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd25519KeyPair(keyUsage?: KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd448KeyPair(keyUsage: any): Promise<{
    publicKey: string;
    privateKey: string;
}>;
