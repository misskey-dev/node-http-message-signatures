import { SignInfoDefaults } from "../utils";
export declare function genSignature(privateKey: CryptoKey, signingString: string, defaults?: SignInfoDefaults): Promise<string>;
