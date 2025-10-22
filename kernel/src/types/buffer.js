export default {
	name: 'buffer',

	accepts(value, spec) {
		return spec.type.includes('buffer');
	},

	validate(value, spec) {
		const buffer = this.normalize(value, spec);

		// Size constraints
		if (spec.maxSize && buffer.length > spec.maxSize) {
			throw new RangeError(
				`Buffer exceeds maximum size: ${buffer.length} > ${spec.maxSize}`,
			);
		}

		if (spec.minSize && buffer.length < spec.minSize) {
			throw new RangeError(
				`Buffer below minimum size: ${buffer.length} < ${spec.minSize}`,
			);
		}

		return buffer;
	},

	normalize(value, spec) {
		if (Buffer.isBuffer(value)) {
			return value;
		}

		if (typeof value === 'string') {
			// Handle base64 strings
			if (this.looksLikeBase64(value)) {
				return Buffer.from(value, 'base64');
			}
			// Handle hex strings
			if (this.looksLikeHex(value)) {
				return Buffer.from(value, 'hex');
			}
			// Default to utf8
			return Buffer.from(value, 'utf8');
		}

		if (Array.isArray(value)) {
			return Buffer.from(value);
		}

		if (
			value &&
			typeof value === 'object' &&
			value.type === 'Buffer' &&
			Array.isArray(value.data)
		) {
			return Buffer.from(value.data);
		}

		throw new TypeError(`Cannot convert to Buffer: ${typeof value}`);
	},

	looksLikeBase64(str) {
		return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0;
	},

	looksLikeHex(str) {
		return /^[0-9A-Fa-f]+$/.test(str);
	},
};
