function round3(value) {
	const pow = Math.pow(10, 3);
	return Math.round(value * pow) / pow;
}

export class PerformanceBase {
	constructor(
		TRYES,
	) {
		this.TRYES = TRYES;
		console.log('Performance test, TRYES:', TRYES);
	}

	start(
		name,
	) {
		console.log(name);
		this.name = name;
		this.startTime = process.hrtime();
	}

	/**
	 * @param {string} name
	 * @param {[number, number]} diff
	 */
	end() {
		const diff = process.hrtime(this.startTime);
		this.name = undefined;
		this.startTime = undefined;
		const ms = diff[0] * 1e3 + diff[1] / 1e6;
		console.log(round3(ms), 'ms', round3(this.TRYES / (ms / 1e3)), 'ops/s');
	}
}
