import { base64 } from 'rfc4648';

const TRYES = 1000000;

function round3(value) {
	const pow = Math.pow(10, 3);
	return Math.round(value * pow) / pow;
}

/**
 * @param {string} name
 * @param {[number, number]} diff
 */
function logPerf(name, diff) {
	const ms = diff[0] * 1e3 + diff[1] / 1e6;
	console.log(name, '\n', round3(ms), 'ms', round3(TRYES / (ms / 1e3)), 'ops/s');
}

// Hello world
const b64Str = 'SGVsbG8gd29ybGQ=';
const b64Arr = [72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100];

console.log('Performance test, TRYES:', TRYES);

{
	if (base64.parse(b64Str).join(',') !== b64Arr.join(',')) {
		throw new Error('rfc4648 decode not equal');
	}
	const start = process.hrtime();
	for (let i = 0; i < TRYES; i++) {
		base64.parse(b64Str);
	}
	logPerf(`decode rfc4648`, process.hrtime(start));
}
{
	if (Uint8Array.from(atob(b64Str), s => s.charCodeAt(0)).join(',') !== b64Arr.join(',')) {
		throw new Error('atob not equal');
	}
	const start = process.hrtime();
	for (let i = 0; i < TRYES; i++) {
		Uint8Array.from(atob(b64Str), s => s.charCodeAt(0));
	}
	logPerf(`decode atob`, process.hrtime(start));
}

{
	if (base64.stringify(b64Arr) !== b64Str) {
		throw new Error('rfc4648 encode not equal');
	}
	const start = process.hrtime();
	for (let i = 0; i < TRYES; i++) {
		base64.stringify(b64Arr);
	}
	logPerf(`encode rfc4648`, process.hrtime(start));
}
{
	if (btoa(String.fromCharCode(...new Uint8Array(b64Arr))) !== b64Str) {
		throw new Error('btoa not equal');
	}
	const start = process.hrtime();
	for (let i = 0; i < TRYES; i++) {
		btoa(String.fromCharCode(...new Uint8Array(b64Arr)));
	}
	logPerf(`encode btoa`, process.hrtime(start));
}
