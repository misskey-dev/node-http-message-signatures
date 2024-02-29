const { HttpSignatureDraft } = require('../../dist');

const header = 'keyId="test",algorithm="rsa-sha256",headers="(request-target) host date accept",signature="test"';
const result = HttpSignatureDraft.parseDraftRequestSignatureHeader(header);
console.log(result);
