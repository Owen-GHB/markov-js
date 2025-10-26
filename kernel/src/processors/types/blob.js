import bufferType from './buffer.js';

export default {
	name: 'blob',

	accepts(value, spec) {
		return spec.type.includes('blob');
	},

	validate(value, spec) {
		const blob = this.normalize(value, spec);

		// Size constraints
		if (
			spec.constraints?.maxSize &&
			blob.size &&
			blob.size > spec.constraints.maxSize
		) {
			throw new RangeError(
				`Blob exceeds maximum size: ${blob.size} > ${spec.constraints.maxSize}`,
			);
		}

		// MIME type constraints
		if (spec.constraints?.allowedTypes && blob.mimeType) {
			if (!spec.constraints.allowedTypes.includes(blob.mimeType)) {
				throw new TypeError(
					`Blob type '${blob.mimeType}' not allowed. Allowed: ${spec.constraints.allowedTypes.join(', ')}`,
				);
			}
		}

		// File extension constraints
		if (spec.constraints?.allowedExtensions && blob.name) {
			const ext = blob.name.split('.').pop()?.toLowerCase();
			if (ext && !spec.constraints.allowedExtensions.includes(ext)) {
				throw new TypeError(
					`Blob extension '.${ext}' not allowed. Allowed: ${spec.constraints.allowedExtensions.map((e) => '.' + e).join(', ')}`,
				);
			}
		}

		return blob;
	},

	normalize(value, spec) {
		if (typeof value === 'string') {
			// Check if it's a data URL
			if (value.startsWith('data:')) {
				const matches = value.match(/^data:([^;]+);base64,(.*)$/);
				if (matches) {
					return {
						type: 'blob',
						mimeType: matches[1],
						data: Buffer.from(matches[2], 'base64'),
						encoding: 'base64',
						size: Buffer.from(matches[2], 'base64').length,
					};
				}
			}

			// Check if it's plain base64
			if (value.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
				return {
					type: 'blob',
					data: Buffer.from(value, 'base64'),
					encoding: 'base64',
					size: Buffer.from(value, 'base64').length,
				};
			}

			// Assume file path
			return {
				type: 'filepath',
				path: value,
				name: value.split(/[\\/]/).pop(),
			};
		}

		// Handle array input (common from multipart form data)
		if (Array.isArray(value)) {
			return {
				type: 'blob',
				data: Buffer.from(value),
				encoding: 'binary',
				size: value.length,
			};
		}

		// Handle case where input is already an object but data needs conversion
		if (value && typeof value === 'object') {
			const normalized = { ...value };

			// Convert data to Buffer if it's an array or needs processing
			if (normalized.data && !Buffer.isBuffer(normalized.data)) {
				if (Array.isArray(normalized.data)) {
					normalized.data = Buffer.from(normalized.data);
				} else if (typeof normalized.data === 'string') {
					normalized.data = Buffer.from(
						normalized.data,
						normalized.encoding || 'utf8',
					);
				} else if (
					normalized.data &&
					typeof normalized.data === 'object' &&
					normalized.data.type === 'Buffer' &&
					Array.isArray(normalized.data.data)
				) {
					normalized.data = Buffer.from(normalized.data.data);
				}

				// Update size if not set
				if (!normalized.size && normalized.data) {
					normalized.size = normalized.data.length;
				}
			}

			return normalized;
		}

		// Already processed or other type
		return value;
	},
};
