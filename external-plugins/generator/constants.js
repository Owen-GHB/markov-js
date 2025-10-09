// Constants for the UI Generator
export const GENERATOR_CONSTANTS = {
	OUTPUT_DIR: '../../generated-ui',
	OUTPUT_FILE: 'index.html',
	CONTRACT_DIR: '../../contract',
	GLOBAL_MANIFEST: 'global.json',
	CSS_FILE: 'global.css',
	MANIFEST_EXTENSION: '.json',
	COMMAND_DIR_REGEX: /^[a-z][a-z0-9_]*$/, // Valid command directory names
	SUPPORTED_PARAM_TYPES: [
		'string',
		'integer',
		'number',
		'boolean',
		'array',
		'object',
		'null',
		'any',
	],

	// HTML element attributes and classes
	HTML_ATTRIBUTES: {
		COMMAND_FORM: 'data-command-form',
		COMMAND_NAME: 'data-command-name',
		PARAM_NAME: 'data-param-name',
		ACTIVE_FORM: 'active-form',
	},

	// Default values for generation
	DEFAULTS: {
		HTML_TITLE: 'Command Interface',
		PAGE_HEADER: 'Command Interface',
		FORM_SUBMIT_BUTTON: 'Execute Command',
		COMMAND_SELECTOR_LABEL: 'Select Command:',
	},
};

export const PARAM_TYPE_MAPPING = {
	string: 'string',
	integer: 'number',
	number: 'number',
	boolean: 'boolean',
	array: 'array',
};
