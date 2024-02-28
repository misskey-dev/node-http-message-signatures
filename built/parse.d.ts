/// <reference types="node" />
/// <reference types="node" />
import { IncomingMessage } from "node:http";
import { Http2ServerRequest } from "node:http2";
/**
 * Parse the request headers
 * DraftとRFCをうまく区別してリクエストをパースする
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 */
export declare function parseRequest(request: IncomingMessage | Http2ServerRequest): void;
