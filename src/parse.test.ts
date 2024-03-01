import { checkClockSkew } from './parse.js';

describe('parse', () => {
	describe(checkClockSkew, () => {
		test('pass (req has delay, normal)', () => {
			const req = new Date('2024-02-28T17:44:06.000Z');
			const now = new Date('2024-02-28T17:44:07.000Z');
			const result = checkClockSkew(req, now, 300 * 1e3, 100);
			expect(result).toBe(undefined);
		});
		test('pass (req fast)', () => {
			const req = new Date('2024-02-28T17:44:06.130Z');
			const now = new Date('2024-02-28T17:44:06.080Z');
			const result = checkClockSkew(req, now, 300 * 1e3, 100);
			expect(result).toBe(undefined);
		});
		test('fail (too delayed)', () => {
			const req = new Date('2024-02-28T17:44:06.000Z');
			const now = new Date('2024-02-28T18:44:06.000Z');
			expect(() => checkClockSkew(req, now, 300 * 1e3, 100))
				.toThrow('Clock skew is invalid: request="2024-02-28T17:44:06.000Z",now="2024-02-28T18:44:06.000Z",diff="3600000"');
		});
		test('fail (too fast)', () => {
			const req = new Date('2024-02-28T17:44:06.000Z');
			const now = new Date('2024-02-28T17:44:05.500Z');
			expect(() => checkClockSkew(req, now, 300 * 1e3, 100))
				.toThrow('Clock skew is invalid: request="2024-02-28T17:44:06.000Z",now="2024-02-28T17:44:05.500Z",diff="-500"');
		});
	});
});
