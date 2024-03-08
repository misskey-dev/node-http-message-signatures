import { IncomingRequest } from "../types.js";
import { collectHeaders } from "../utils.js";
import { verifyRFC3230DigestHeader } from "./digest-rfc3230.js";
import { DigestSource } from "./utils.js";

export async function verifyDigestHeader(
	request: IncomingRequest,
	rawBody: DigestSource,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
	const headerKeys = new Set(Object.keys(collectHeaders(request)));
	if (headerKeys.has('content-digest')) {
		throw new Error('Not implemented yet');
	} else if (headerKeys.has('digest')) {
		return await verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest, errorLogger);
	}
	if (failOnNoDigest) {
		if (errorLogger) errorLogger('Content-Digest or Digest header not found');
		return false;
	}
	return true;
}
