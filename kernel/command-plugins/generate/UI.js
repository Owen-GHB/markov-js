// File: UI.js

import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

/**
 * Main EJS-based UI Generator class that creates a complete SPA from contract manifests
 */
export class UI {
	constructor() {
		this.__dirname = path.dirname(fileURLToPath(import.meta.url));
	}

	/**
	 * Generate the complete SPA from manifests using EJS templates
	 * @param {string} userTemplateDir - Directory for user templates
	 * @param {string} generatedUIDir - Directory for generated UI output
	 * @param {Object} manifest - The contract manifest with global and command information
	 */
	async run(userTemplateDir, generatedUIDir, manifest) {
		try {
			const outputDir = generatedUIDir;

			// First try user templates, fall back to built-in templates
			let templateDir;
			if (userTemplateDir && fs.existsSync(userTemplateDir)) {
				templateDir = userTemplateDir;
				console.log(`Using user templates from: ${templateDir}`);
			} else {
				// Fall back to built-in templates
				templateDir = path.resolve(this.__dirname, 'templates');
				console.log(`Using built-in templates from: ${templateDir}`);

				// Verify built-in templates exist
				if (!fs.existsSync(templateDir)) {
					throw new Error(
						`Built-in templates directory not found: ${templateDir}. Please ensure the templates are included with the generator.`,
					);
				}
			}

			console.log('Starting EJS-based UI generation...');

			// Use the provided manifest directly
			const globalManifest = manifest;
			const commandManifests = manifest.commands || [];
			console.log(
				`Processing manifest with ${Object.keys(commandManifests).length} command manifests`,
			);

			// Ensure output directory exists and is empty
			if (fs.existsSync(outputDir)) {
				console.log(`Emptying output directory: ${outputDir}`);
				this.emptyDirectory(outputDir);
			} else {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Generate all command forms using EJS templates
			const commandForms = await this.generateCommandForms(
				commandManifests,
				globalManifest,
				templateDir,
			);

			// Generate the main SPA using EJS template
			await this.generateSPA(
				globalManifest,
				commandManifests,
				commandForms,
				outputDir,
				templateDir,
			);

			// Generate client-side JavaScript
			await this.generateClientSideJavaScript(
				globalManifest,
				commandManifests,
				outputDir,
				templateDir,
			);

			// Copy CSS file
			await this.copyCSSFile(templateDir, outputDir);

			console.log(`EJS-based UI generated successfully at: ${outputDir}`);
			console.log('UI generation completed!');
		} catch (error) {
			console.error('Error during EJS-based UI generation:', error);
			throw error;
		}
	}

	/**
	 * Generate all command forms using EJS templates
	 * @param {Array} commandManifests - Array of command manifests
	 * @param {Object} globalManifest - Global manifest for state defaults
	 * @param {string} templateDir - Path to templates directory
	 * @returns {Promise<Array>} Array of rendered command form HTML
	 */
	async generateCommandForms(commandManifests, globalManifest, templateDir) {
		const initialState = globalManifest.stateDefaults || {};
		const commandForms = [];

		for (const command of Object.values(commandManifests)) {
			// Skip namespaced commands
			if (command.name && command.name.includes('/')) {
				console.log(`Skipping namespaced command: ${command.name}`);
				continue;
			}

			try {
				const formHtml = await this.renderCommandForm(
					command,
					initialState,
					templateDir,
				);
				commandForms.push(formHtml);
			} catch (error) {
				console.error(
					`Error generating form for command ${command.name}:`,
					error,
				);
				throw error;
			}
		}

		return commandForms;
	}

	/**
	 * Render a single command form using EJS template
	 * @param {Object} command - Command manifest
	 * @param {Object} state - Current state for runtime fallbacks
	 * @param {string} templateDir - Path to templates directory
	 * @returns {Promise<string>} Rendered HTML for the command form
	 */
	async renderCommandForm(command, state, templateDir) {
		const formTemplatePath = path.join(templateDir, 'command-form.ejs');

		if (!fs.existsSync(formTemplatePath)) {
			throw new Error(`Command form template not found: ${formTemplatePath}`);
		}

		const template = fs.readFileSync(formTemplatePath, 'utf8');

		// Generate parameter fields for this command
		const parameterFields = await this.generateParameterFields(
			command,
			state,
			templateDir,
		);

		const data = {
			command: command,
			parameterFields: parameterFields,
			formSubmitButton: 'Execute Command',
		};

		return ejs.render(template, data);
	}

	/**
	 * Generate parameter fields for a command using EJS template
	 * @param {Object} command - Command manifest
	 * @param {Object} state - Current state for runtime fallbacks
	 * @param {string} templateDir - Path to templates directory
	 * @returns {Promise<string>} Rendered HTML for all parameter fields
	 */
	async generateParameterFields(command, state, templateDir) {
		const paramTemplatePath = path.join(templateDir, 'param-field.ejs');

		if (!fs.existsSync(paramTemplatePath)) {
			throw new Error(
				`Parameter field template not found: ${paramTemplatePath}`,
			);
		}

		const template = fs.readFileSync(paramTemplatePath, 'utf8');
		let allParameterFields = '';

		for (const paramName in command.parameters || {}) {
			const param = command.parameters[paramName];
			param.name = paramName; // Ensure name is available

			// Calculate default value considering runtime fallbacks
			const defaultValue = this.getParameterDefaultValue(param, state);

			const data = {
				param: param,
				defaultValue: defaultValue,
				// Make sure constraints are passed through
				constraints: param.constraints || {},
			};

			const fieldHtml = ejs.render(template, data);
			allParameterFields += fieldHtml;
		}

		return allParameterFields;
	}

	/**
	 * Get default value for a parameter considering runtime fallbacks
	 * @param {Object} param - Parameter definition
	 * @param {Object} state - Current state object
	 * @returns {any} Default value
	 */
	getParameterDefaultValue(param, state) {
		// First check for runtime fallback
		if (
			param.runtimeFallback &&
			state &&
			state[param.runtimeFallback] !== undefined
		) {
			return state[param.runtimeFallback];
		}

		// Otherwise use default from manifest
		if (param.default !== undefined) {
			return param.default;
		}

		return undefined;
	}

	/**
	 * Generate the main SPA HTML using EJS template
	 * @param {Object} globalManifest - Global manifest
	 * @param {Array} commandManifests - Array of command manifests
	 * @param {Array} commandForms - Array of rendered command form HTML
	 * @param {string} outputDir - Output directory
	 * @param {string} templateDir - Templates directory
	 */
	async generateSPA(
		globalManifest,
		commandManifests,
		commandForms,
		outputDir,
		templateDir,
	) {
		const baseTemplatePath = path.join(templateDir, 'spa-base.ejs');

		if (!fs.existsSync(baseTemplatePath)) {
			throw new Error(`SPA base template not found: ${baseTemplatePath}`);
		}

		const template = fs.readFileSync(baseTemplatePath, 'utf8');

		const data = {
			htmlTitle: globalManifest.name || 'Command Interface',
			pageHeader: globalManifest.description || 'Command Interface',
			commandSelectorLabel: 'Select Command:',
			commands: Object.values(commandManifests),
			commandForms: commandForms.join('\n'),
		};

		const renderedHtml = ejs.render(template, data);
		const htmlFilePath = path.join(outputDir, 'index.html');
		fs.writeFileSync(htmlFilePath, renderedHtml);

		console.log(`Generated main SPA: ${htmlFilePath}`);
	}

	/**
	 * Generate client-side JavaScript file
	 * @param {Object} globalManifest - Global manifest
	 * @param {Array} commandManifests - Array of command manifests
	 * @param {string} outputDir - Output directory
	 * @param {string} templateDir - Templates directory
	 */
	async generateClientSideJavaScript(
		globalManifest,
		commandManifests,
		outputDir,
		templateDir,
	) {
		const templateFiles = ['core.ejs', 'ui.ejs', 'api.ejs'];
		let combinedJS = '';

		for (const templateFile of templateFiles) {
			const templatePath = path.join(templateDir, 'js', templateFile);
			if (!fs.existsSync(templatePath)) {
				throw new Error(`JavaScript template not found: ${templatePath}`);
			}

			const template = fs.readFileSync(templatePath, 'utf8');
			const data = {
				initialState: globalManifest.stateDefaults || {},
				commands: commandManifests,
			};

			combinedJS += ejs.render(template, data) + '\n\n';
		}

		const jsFilePath = path.join(outputDir, 'app.js');
		fs.writeFileSync(jsFilePath, combinedJS);

		console.log(`Generated client-side JavaScript: ${jsFilePath}`);
	}

	/**
	 * Copy CSS file to output directory
	 * @param {string} templateDir - Templates directory
	 * @param {string} outputDir - Output directory
	 */
	async copyCSSFile(templateDir, outputDir) {
		const cssSourcePath = path.join(templateDir, 'global.css');
		const cssDestPath = path.join(outputDir, 'app.css');

		if (fs.existsSync(cssSourcePath)) {
			fs.copyFileSync(cssSourcePath, cssDestPath);
			console.log(`Copied CSS file: ${cssDestPath}`);
		} else {
			console.warn(`CSS file not found at: ${cssSourcePath}`);
		}
	}

	/**
	 * Empty a directory by removing all files and subdirectories
	 * @param {string} dirPath - Path to the directory to empty
	 */
	emptyDirectory(dirPath) {
		const items = fs.readdirSync(dirPath);

		for (const item of items) {
			const itemPath = path.join(dirPath, item);
			const stat = fs.statSync(itemPath);

			if (stat.isDirectory()) {
				this.emptyDirectory(itemPath);
				fs.rmdirSync(itemPath);
			} else {
				fs.unlinkSync(itemPath);
			}
		}
	}
}
