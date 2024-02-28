type ParsedSignature = {
    scheme: 'Signature';
    params: {
        keyId: string;
        algorithm?: string;
        headers: string[];
        signature: string;
    };
    signingString: string;
    algorithm?: string;
    keyId: string;
};
export declare function verifySignature(parsed: ParsedSignature, publicKeyPem: string): boolean;
export {};
