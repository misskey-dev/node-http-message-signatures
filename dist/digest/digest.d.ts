import { IncomingRequest } from "../types";
import { DigestSource } from "./utils";
export declare function verifyDigestHeader(request: IncomingRequest, rawBody: DigestSource, failOnNoDigest?: boolean, errorLogger?: ((message: any) => any)): Promise<boolean>;
