/// <reference types="node" />
import { IncomingRequest } from "src/types";
import { BinaryLike } from "node:crypto";
export declare function verifyDigestHeader(request: IncomingRequest, rawBody: BinaryLike, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): boolean;
