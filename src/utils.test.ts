import { genASN1Length } from "./utils";

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
