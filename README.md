@misskey-dev/node-http-message-signatures
----

Implementation of [HTTP Signatures "Draft", RFC 9421](https://datatracker.ietf.org/doc/rfc9421/), [RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) for JavaScript.

We initially started working on it with the intention of using it in Node.js, but since we rewrote it to Web Crypto API, it may also work in browsers and edge workers.

It is created for Misskey's ActivityPub implementation.

## Context
### HTTP Signatures "Draft" and RFC 9421
[RFC 9421](https://datatracker.ietf.org/doc/rfc9421/) is the standard used for signing HTTP communications, but has been used since draft in the world of ActivityPub server-to-server communications with Misskey, Mastodon, and others.
The title "HTTP Signatures" in the draft was changed to "HTTP Message Signatures" in the RFC.

This library allows both the draft and RFC to be used.

### RFC 3230 and RFC 9530
[RFC 3230](https://datatracker.ietf.org/doc/rfc3230/) and [RFC 9530](https://datatracker.ietf.org/doc/rfc9530/) are standards used for expressing the digest of the body of an HTTP communication. RFC 9530 was released at the same time as RFC 9421 and obsoletes RFC 3230.

Since ActivityPub also needs digest validation, this library also implements functions to create and validate digests.

## Comparison
### With http-signature
Previously, we used `http-signature` (`@peertube/http-signature` to be exact) to parse and verify (Draft) signatures, and this library replaces those implementations as well.

This is because `TritonDataCenter/node-sshpk` (formerly `joient/node-sshpk`), on which http-signature depends, is slower than `crypto`.

## ActivityPub Compatibility
One of the motivations for creating this package is to make Misskey compatible with the Ed25519 signature instead of RSA. In doing so, there is a need to ensure compatibility.

### HTTP Message Signatures Implementation Level
As a way of expressing the HTTP Message Signatures support status of software, I propose to express it as an implementation level (`string` of two-digit numbers).

~~Newer versions of Misskey have this string in `metadata.httpMessageSignaturesImplementationLevel` of nodeinfo.~~

|Level|Definition|
|:-:|:--|
|`00`|"Draft", RFC 3230, RSA-SHA256 Only|
|`01`|"Draft", RFC 3230, Supports multiple public keys and Ed25519|
|`10`|RFC 9421, RFC 9530, RSA-SHA256 Only|
|`11`|RFC 9421, RFC 9530, Supports multiple public keys and Ed25519|

### `additionalPublicKeys`
Misskey added the `additionalPublicKeys` property to Actor to allow it to have multiple public keys. This is an array of [publicKey](https://docs.joinmastodon.org/spec/activitypub/#publicKey)s.

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
      {
        "Key": "sec:Key",
        "additionalPublicKeys": "misskey:additionalPublicKeys"
      }
  ],
  "id": "https://misskey.io/users/7rkrarq81i",
  "type": "Person",
  "publicKey": {
    "id": "https://misskey.io/users/7rkrarq81i#main-key",
    "type": "Key",
    "owner": "https://misskey.io/users/7rkrarq81i",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----..."
  },
  "additionalPublicKeys": [{
    "id": "https://misskey.io/users/7rkrarq81i#ed25519-key",
    "type": "Key",
    "owner": "https://misskey.io/users/7rkrarq81i",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----..."
  }]
}
```

## Usage

### Installation
```
npm install @misskey-dev/node-http-message-signatures
```

### Parse and verify
Parse and verify in fastify web server, implements ActivityPub inbox

See [the usage (parse-and-verify-fastify.ts)](./test/unit/readme-usage/parse-and-verify-fastify.ts)

### Sign and Post

See [the usage (sign-and-post.ts)](./test/unit/readme-usage/sign-and-post.ts)
