import { base64 } from 'rfc4648';
import { PerformanceBase } from './base.js';

const test = new PerformanceBase(1e6);

// Hello world
const b64Str = 'SGVsbG8gd29ybGQ=';
const b64Arr = [72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100];

{
	if (base64.parse(b64Str).join(',') !== b64Arr.join(',')) {
		throw new Error('rfc4648 decode not equal');
	}
	test.start(`decode rfc4648`);
	for (let i = 0; i < test.TRYES; i++) {
		base64.parse(b64Str);
	}
	test.end();
}
{
	if (Uint8Array.from(atob(b64Str), s => s.charCodeAt(0)).join(',') !== b64Arr.join(',')) {
		throw new Error('atob not equal');
	}
	test.start(`decode atob`);
	for (let i = 0; i < test.TRYES; i++) {
		Uint8Array.from(atob(b64Str), s => s.charCodeAt(0));
	}
	test.end();
}

{
	if (base64.stringify(b64Arr) !== b64Str) {
		throw new Error('rfc4648 encode not equal');
	}
	test.start(`encode rfc4648`);
	for (let i = 0; i < test.TRYES; i++) {
		base64.stringify(b64Arr);
	}
	test.end();
}
{
	if (btoa(String.fromCharCode(...new Uint8Array(b64Arr))) !== b64Str) {
		throw new Error('btoa not equal');
	}
	test.start(`encode btoa`);
	for (let i = 0; i < test.TRYES; i++) {
		btoa(String.fromCharCode(...new Uint8Array(b64Arr)));
	}
	test.end();
}

{
	const equal = (a, b) => {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}
	const arrA = new Uint8Array(b64Arr);
	const arrB = new Uint8Array(b64Arr);
	if (arrA === arrB) {
		throw new Error('comparing same object');
	}
	test.start(`uint8array equality for of`);
	for (let i = 0; i < test.TRYES; i++) {
		if (!equal(arrA, arrB)) throw new Error('not equal');
	}
	test.end();
}
{
	const equal = (a, b) => {
		if (a.length !== b.length) return false;
		return a.every((v, i) => v === b[i]);
	}
	const arrA = new Uint8Array(b64Arr);
	const arrB = new Uint8Array(b64Arr);
	if (arrA === arrB) {
		throw new Error('comparing same object');
	}
	test.start(`uint8array equality arr.every`);
	for (let i = 0; i < test.TRYES; i++) {
		if (!equal(arrA, arrB)) throw new Error('not equal');
	}
	test.end();
}
