/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { ECNamedCurve } from './types';
export declare function exportPublicKeyPem(key: webcrypto.CryptoKey): Promise<string>;
export declare function exportPrivateKeyPem(key: webcrypto.CryptoKey): Promise<string>;
export declare function genRsaKeyPair(modulusLength?: number, keyUsage?: webcrypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEcKeyPair(namedCurve?: ECNamedCurve, keyUsage?: webcrypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd25519KeyPair(keyUsage?: webcrypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd448KeyPair(keyUsage: any): Promise<{
    publicKey: string;
    privateKey: string;
}>;
