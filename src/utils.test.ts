import { genASN1Length, splitPer64Chars } from "./utils";
import { rsa4096 } from "../test/keys";

describe(genASN1Length, () => {
	test('10', () => {
		expect(genASN1Length(10)).toEqual(Uint8Array.from([10]));
	});
	test('190', () => {
		expect(genASN1Length(190)).toEqual(Uint8Array.from([0x81, 190]));
	});
	test('300', () => {
		expect(genASN1Length(300)).toEqual(Uint8Array.from([0x82, 1, 0x2c]));
	});
	test('1145141919810', () => {
		expect(genASN1Length(1145141919810)).toEqual(Uint8Array.from([0x86, 1, 10, 159, 199, 0, 66]));
	});
});

describe(splitPer64Chars, () => {
	test('short', () => {
		expect(splitPer64Chars('a').length).toBe(1);
		expect(splitPer64Chars('a')[0]).toBe('a');
	});
	test('normal', () => {
		expect(splitPer64Chars(rsa4096.privateKey).length).toBe(Math.ceil(rsa4096.privateKey.length / 64));
	});
});
