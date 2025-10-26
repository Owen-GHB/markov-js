export default {
	name: 'integer',

	accepts(value, spec) {
		return spec.type.includes('integer');
	},

	validate(value, spec) {
		const num = parseInt(value, 10);
		if (isNaN(num)) throw new TypeError(`Must be an integer, got: ${value}`);
		if (!Number.isInteger(num))
			throw new TypeError(`Must be an integer, got: ${value}`);

		if (spec.min !== undefined && num < spec.min) {
			throw new RangeError(`Must be at least ${spec.min}, got: ${num}`);
		}
		if (spec.max !== undefined && num > spec.max) {
			throw new RangeError(`Must be at most ${spec.max}, got: ${num}`);
		}

		return num;
	},

	normalize(value, spec) {
		return parseInt(value, 10);
	},
};
