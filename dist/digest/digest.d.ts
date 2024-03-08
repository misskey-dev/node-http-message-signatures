import { IncomingRequest } from "../types.js";
import { DigestSource } from "./utils.js";
export declare function verifyDigestHeader(request: IncomingRequest, rawBody: DigestSource, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): Promise<boolean>;
