import { IncomingRequest } from "src/types";
import { objectLcKeys } from "src/utils";
import { verifyRFC3230DigestHeader } from "./digest-rfc3230";
import { BinaryLike } from "crypto";

export function verifyDigestHeader(
	request: IncomingRequest,
	rawBody: BinaryLike,
	failOnNoDigest = true,
	errorLogger?: ((message: any) => any)
) {
	const headerKeys = objectLcKeys(request.headers);
	if (headerKeys.has('content-digest')) {
		throw new Error('Not implemented yet');
	} else if (headerKeys.has('digest')) {
		return verifyRFC3230DigestHeader(request, rawBody, failOnNoDigest, errorLogger);
	}
	if (failOnNoDigest) {
		if (errorLogger) errorLogger('Content-Digest or Digest header not found');
		return false;
	}
	return true;
}
