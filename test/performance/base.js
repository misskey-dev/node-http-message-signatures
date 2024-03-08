import chalk from "chalk";

function round3(value) {
	const pow = Math.pow(10, 3);
	return Math.round(value * pow) / pow;
}

export class PerformanceBase {
	constructor(
		TRYES,
		log = console.log,
	) {
		this.TRYES = TRYES;
		this.log = log;
		this.log(chalk.bold('Performance test, TRYES:'), TRYES);
	}

	start(
		name,
	) {
		this.log(chalk.underline(name));
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
		this.log(
			chalk.gray(chalk.yellow(round3(ms).toString().padStart(14))), 'ms',
			chalk.gray(chalk.yellow(round3(this.TRYES / (ms / 1e3)).toString().padStart(14))), 'ops/s',
		);
	}
}
