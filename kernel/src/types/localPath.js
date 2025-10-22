// src/types/localPath.js
import path from 'path';

export default {
	name: 'localPath',

	accepts(value, spec) {
		return spec.type.includes('localPath');
	},

	validate(value, spec) {
		if (typeof value !== 'string') {
			throw new TypeError(`localPath must be a string, got: ${typeof value}`);
		}

		// Accept both relative paths AND absolute paths
		const isRelative = value.startsWith('./') || value.startsWith('../');
		const isAbsolute = path.isAbsolute(value);

		if (!isRelative && !isAbsolute) {
			throw new TypeError(
				`localPath must be a relative path (./ or ../) or absolute path, got: ${value}`,
			);
		}

		return this.normalize(value, spec);
	},

	normalize(value, spec) {
		// If already absolute, return as-is
		if (path.isAbsolute(value)) {
			return value;
		}

		// Convert relative path to absolute path relative to cwd
		return path.resolve(process.cwd(), value);
	},
};
