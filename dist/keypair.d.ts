/// <reference types="node" />
import type { webcrypto as crypto } from 'node:crypto';
import { ECNamedCurve } from './types';
export declare function exportPublicKeyPem(key: crypto.CryptoKey): Promise<string>;
export declare function exportPrivateKeyPem(key: crypto.CryptoKey): Promise<string>;
export declare function genRsaKeyPair(modulusLength?: number, keyUsage?: crypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEcKeyPair(namedCurve?: ECNamedCurve, keyUsage?: crypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd25519KeyPair(keyUsage?: crypto.KeyUsage[]): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function genEd448KeyPair(keyUsage: any): Promise<{
    publicKey: string;
    privateKey: string;
}>;
