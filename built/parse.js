/**
 * Parse the request headers
 * DraftとRFCをうまく区別してリクエストをパースする
 * @param request http.IncomingMessage | http2.Http2ServerRequest
 */
export function parseRequest(request) {
    console.log(request.headers);
}
