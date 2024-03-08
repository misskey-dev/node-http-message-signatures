import { IncomingRequest } from "../types";
import { collectHeaders } from "../utils";
import { verifyRFC3230DigestHeader } from "./digest-rfc3230";
import { DigestSource } from "./utils";

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
