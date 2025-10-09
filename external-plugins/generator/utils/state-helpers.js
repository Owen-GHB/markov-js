/**
 * Helper functions for client-side state management
 */
export class StateHelpers {
	/**
	 * Initialize state from global manifest defaults
	 * @param {Object} globalManifest - The global manifest containing state defaults
	 * @returns {Object} Initialized state object
	 */
	static initializeState(globalManifest) {
		if (!globalManifest || !globalManifest.stateDefaults) {
			return {};
		}

		// Create a copy of the state defaults to avoid mutations
		return JSON.parse(JSON.stringify(globalManifest.stateDefaults));
	}

	/**
	 * Update state based on command side effects
	 * @param {Object} state - Current state object
	 * @param {Object} command - Command that was executed
	 * @param {Object} result - Result of the command execution
	 * @param {Object} commandManifest - Manifest for the executed command
	 * @returns {Object} New state object with updates applied
	 */
	static updateState(state, command, result, commandManifest) {
		if (!state || !commandManifest || !commandManifest.sideEffects) {
			return { ...state };
		}

		let newState = { ...state };
		const sideEffects = commandManifest.sideEffects;

		// Handle setState side effects
		if (sideEffects.setState) {
			for (const [key, rule] of Object.entries(sideEffects.setState)) {
				let value;

				// Check if value comes from command parameter
				if (
					rule.fromParam &&
					command.args &&
					command.args[rule.fromParam] !== undefined
				) {
					value = command.args[rule.fromParam];
				}
				// Check if value comes from result
				else if (rule.fromResult) {
					// Simplified - in a real implementation this would extract from the result
				}
				// Check if value is defined by a template
				else if (rule.template) {
					value = this.evaluateTemplate(rule.template, {
						...command.args,
						result,
					});
				}

				if (value !== undefined) {
					newState[key] = value;
				}
			}
		}

		// Handle clearState side effects
		if (sideEffects.clearState) {
			for (const key of sideEffects.clearState) {
				delete newState[key];
			}
		}

		// Handle clearStateIf side effects
		if (sideEffects.clearStateIf) {
			for (const [key, rule] of Object.entries(sideEffects.clearStateIf)) {
				if (
					rule.fromParam &&
					command.args &&
					command.args[rule.fromParam] !== undefined
				) {
					const paramValue = command.args[rule.fromParam];
					const stateValue = state[key];

					// Clear state if the parameter value matches the current state value
					if (paramValue === stateValue) {
						delete newState[key];
					}
				}
			}
		}

		return newState;
	}

	/**
	 * Evaluate a template string using values from a data bag
	 * @param {string} template - Template string with {{placeholders}}
	 * @param {Object} bag - Data object containing values for placeholders
	 * @returns {string} Evaluated string with placeholders replaced
	 */
	static evaluateTemplate(template, bag) {
		return template.replace(
			/\{\{(\w+)(?:\s*\|\s*(\w+))?\}\}/g,
			(_, key, filter) => {
				let val = bag[key];
				if (val === undefined) return '';

				if (filter === 'basename') {
					// Extract filename without extension
					val = String(val).replace(/\.[^/.]+$/, '');
				} else if (filter === 'dirname') {
					// Extract directory name (simplified)
					const pathParts = String(val).split('/');
					pathParts.pop();
					val = pathParts.join('/');
				}

				return String(val);
			},
		);
	}

	/**
	 * Get a value from state with fallback
	 * @param {Object} state - Current state object
	 * @param {string} key - Key to look up
	 * @param {*} fallback - Fallback value if key doesn't exist
	 * @returns {*} Value from state or fallback
	 */
	static getStateValue(state, key, fallback = undefined) {
		if (!state) return fallback;
		return state[key] !== undefined ? state[key] : fallback;
	}

	/**
	 * Check if state has a specific key
	 * @param {Object} state - Current state object
	 * @param {string} key - Key to check
	 * @returns {boolean} True if key exists in state
	 */
	static hasStateKey(state, key) {
		if (!state) return false;
		return state[key] !== undefined;
	}
}
