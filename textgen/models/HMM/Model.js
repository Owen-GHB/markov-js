import {
	TextModel,
	GenerationContext,
	GenerationResult,
} from '../Interfaces.js';
import { random } from '../RNG.js';

/**
 * Hidden Markov Model for text generation
 * - Models hidden states that emit observable tokens
 * - Supports Baum-Welch (EM) algorithm for unsupervised learning
 * - Includes Viterbi algorithm for most likely state sequence
 */
export class HMModel extends TextModel {
	constructor(options = {}) {
		super(options);
		this.numStates = options.numStates || 10;
		this.maxIterations = options.maxIterations || 100;
		this.tolerance = options.tolerance || 1e-6;

		// State transition probabilities: A[i][j] = P(state_j | state_i)
		this.transitions = null;

		// Emission probabilities: B[i][j] = P(token_j | state_i)
		this.emissions = null;

		// Initial state probabilities: π[i] = P(state_i)
		this.initial = null;

		// Vocabulary and state mappings
		this.tokenToIndex = new Map();
		this.indexToToken = [];
		this.stateToIndex = new Map();
		this.indexToState = [];

		this.modelType = 'hmm';
	}

	/**
	 * Get model capabilities
	 * @returns {Object}
	 */
	getCapabilities() {
		return {
			supportsTemperature: false, // HMM doesn't naturally support temperature
			supportsConstraints: true,
			supportsConditionalGeneration: true,
			supportsBatchGeneration: true,
			maxOrder: 1, // HMM is first-order by nature
			modelType: this.modelType,
			supportsUnsupervisedLearning: true,
		};
	}

	/**
	 * Initialize model parameters randomly
	 * @param {string[]} vocabulary - Array of unique tokens
	 */
	initializeParameters(vocabulary) {
		// Build vocabulary mappings
		this.tokenToIndex = new Map();
		this.indexToToken = vocabulary;
		vocabulary.forEach((token, i) => this.tokenToIndex.set(token, i));

		// Initialize state mappings
		this.stateToIndex = new Map();
		this.indexToState = Array.from(
			{ length: this.numStates },
			(_, i) => `state_${i}`,
		);
		this.indexToState.forEach((state, i) => this.stateToIndex.set(state, i));

		// Initialize transition matrix (row stochastic)
		this.transitions = Array.from({ length: this.numStates }, () =>
			Array.from({ length: this.numStates }, () => Math.random()),
		);
		this.normalizeMatrix(this.transitions);

		// Initialize emission matrix (row stochastic)
		this.emissions = Array.from({ length: this.numStates }, () =>
			Array.from({ length: vocabulary.length }, () => Math.random()),
		);
		this.normalizeMatrix(this.emissions);

		// Initialize initial state probabilities
		this.initial = Array.from({ length: this.numStates }, () => Math.random());
		this.normalizeVector(this.initial);
	}

	/**
	 * Normalize a matrix to make rows sum to 1
	 * @param {number[][]} matrix - Matrix to normalize
	 */
	normalizeMatrix(matrix) {
		for (let i = 0; i < matrix.length; i++) {
			const rowSum = matrix[i].reduce((sum, val) => sum + val, 0);
			if (rowSum > 0) {
				for (let j = 0; j < matrix[i].length; j++) {
					matrix[i][j] /= rowSum;
				}
			} else {
				// If row sums to 0, set uniform distribution
				const uniformVal = 1 / matrix[i].length;
				for (let j = 0; j < matrix[i].length; j++) {
					matrix[i][j] = uniformVal;
				}
			}
		}
	}

	/**
	 * Normalize a vector to sum to 1
	 * @param {number[]} vector - Vector to normalize
	 */
	normalizeVector(vector) {
		const sum = vector.reduce((s, v) => s + v, 0);
		if (sum > 0) {
			for (let i = 0; i < vector.length; i++) {
				vector[i] /= sum;
			}
		} else {
			const uniformVal = 1 / vector.length;
			for (let i = 0; i < vector.length; i++) {
				vector[i] = uniformVal;
			}
		}
	}

	/**
	 * Train the HMM using Baum-Welch algorithm (EM)
	 * @param {string[]} tokens - Training tokens
	 * @param {Object} options - Training options
	 */
	train(tokens, options = {}) {
		if (!Array.isArray(tokens) || tokens.length === 0) {
			throw new Error('Training tokens must be a non-empty array');
		}

		// Check if tokens is an array of arrays
		if (tokens.some(Array.isArray)) {
			// Train on each sub-array separately
			for (const subTokens of tokens) {
				this.train(subTokens, options);
			}
			return;
		}

		if (tokens.length === 0) {
			throw new Error('Training tokens must be a non-empty array');
		}

		// Build vocabulary from tokens if not provided
		const vocabulary = options.vocabulary || [...new Set(tokens)];
		this.initializeParameters(vocabulary);

		let prevLogLikelihood = -Infinity;
		let converged = false;

		for (let iter = 0; iter < this.maxIterations && !converged; iter++) {
			// Forward-Backward algorithm
			const { alpha, beta, scaleFactors, logLikelihood } =
				this.forwardBackward(tokens);

			// Check for convergence
			if (Math.abs(logLikelihood - prevLogLikelihood) < this.tolerance) {
				converged = true;
			}
			prevLogLikelihood = logLikelihood;

			// Re-estimate parameters
			this.reestimateParameters(tokens, alpha, beta, scaleFactors);

			if (options.verbose) {
				console.log(
					`Iteration ${iter + 1}: log-likelihood = ${logLikelihood.toFixed(2)}`,
				);
			}
		}
	}

	/**
	 * Forward-Backward algorithm
	 * @param {string[]} tokens - Sequence of tokens
	 * @returns {Object} - Forward/backward matrices and scaling factors
	 */
	forwardBackward(tokens) {
		const T = tokens.length;
		const N = this.numStates;

		// Forward variables (alpha) and scaling factors
		const alpha = Array.from({ length: T }, () => new Array(N).fill(0));
		const scaleFactors = new Array(T).fill(0);

		// Initialize alpha
		const firstTokenIdx = this.tokenToIndex.get(tokens[0]);
		for (let i = 0; i < N; i++) {
			alpha[0][i] = this.initial[i] * this.emissions[i][firstTokenIdx];
			scaleFactors[0] += alpha[0][i];
		}

		// Scale alpha[0][i]
		scaleFactors[0] = scaleFactors[0] || 1; // prevent division by zero
		for (let i = 0; i < N; i++) {
			alpha[0][i] /= scaleFactors[0];
		}

		// Recursion for forward pass
		for (let t = 1; t < T; t++) {
			const tokenIdx = this.tokenToIndex.get(tokens[t]);
			for (let j = 0; j < N; j++) {
				let sum = 0;
				for (let i = 0; i < N; i++) {
					sum += alpha[t - 1][i] * this.transitions[i][j];
				}
				alpha[t][j] = sum * this.emissions[j][tokenIdx];
				scaleFactors[t] += alpha[t][j];
			}

			// Scale alpha[t][j]
			scaleFactors[t] = scaleFactors[t] || 1;
			for (let j = 0; j < N; j++) {
				alpha[t][j] /= scaleFactors[t];
			}
		}

		// Backward variables (beta)
		const beta = Array.from({ length: T }, () => new Array(N).fill(0));

		// Initialize beta
		for (let i = 0; i < N; i++) {
			beta[T - 1][i] = 1 / scaleFactors[T - 1];
		}

		// Recursion for backward pass
		for (let t = T - 2; t >= 0; t--) {
			const nextTokenIdx = this.tokenToIndex.get(tokens[t + 1]);
			for (let i = 0; i < N; i++) {
				beta[t][i] = 0;
				for (let j = 0; j < N; j++) {
					beta[t][i] +=
						this.transitions[i][j] *
						this.emissions[j][nextTokenIdx] *
						beta[t + 1][j];
				}
				beta[t][i] /= scaleFactors[t];
			}
		}

		// Compute log likelihood
		let logLikelihood = 0;
		for (let t = 0; t < T; t++) {
			logLikelihood += Math.log(scaleFactors[t]);
		}

		return { alpha, beta, scaleFactors, logLikelihood };
	}

	/**
	 * Re-estimate model parameters using EM
	 * @param {string[]} tokens - Training tokens
	 * @param {number[][]} alpha - Forward probabilities
	 * @param {number[][]} beta - Backward probabilities
	 * @param {number[]} scaleFactors - Scaling factors
	 */
	reestimateParameters(tokens, alpha, beta, scaleFactors) {
		const T = tokens.length;
		const N = this.numStates;
		const V = this.indexToToken.length;

		// Compute gamma (state probabilities) and xi (transition probabilities)
		const gamma = Array.from({ length: T }, () => new Array(N).fill(0));
		const xi = Array.from({ length: T - 1 }, () =>
			Array.from({ length: N }, () => new Array(N).fill(0)),
		);

		// Compute gamma and xi
		for (let t = 0; t < T - 1; t++) {
			const tokenIdx = this.tokenToIndex.get(tokens[t + 1]);
			const sumGamma = scaleFactors[t] > 0 ? 1 / scaleFactors[t] : 0;

			for (let i = 0; i < N; i++) {
				gamma[t][i] = alpha[t][i] * beta[t][i] * sumGamma;

				for (let j = 0; j < N; j++) {
					xi[t][i][j] =
						alpha[t][i] *
						this.transitions[i][j] *
						this.emissions[j][tokenIdx] *
						beta[t + 1][j];
				}
			}

			// Normalize xi[t][i][j]
			let sumXi = 0;
			for (let i = 0; i < N; i++) {
				for (let j = 0; j < N; j++) {
					sumXi += xi[t][i][j];
				}
			}

			if (sumXi > 0) {
				for (let i = 0; i < N; i++) {
					for (let j = 0; j < N; j++) {
						xi[t][i][j] /= sumXi;
					}
				}
			}
		}

		// Handle last time step for gamma
		const sumGammaLast = scaleFactors[T - 1] > 0 ? 1 / scaleFactors[T - 1] : 0;
		for (let i = 0; i < N; i++) {
			gamma[T - 1][i] = alpha[T - 1][i] * beta[T - 1][i] * sumGammaLast;
		}

		// Re-estimate initial state probabilities
		for (let i = 0; i < N; i++) {
			this.initial[i] = gamma[0][i];
		}

		// Re-estimate transition probabilities
		for (let i = 0; i < N; i++) {
			let sumGamma = 0;
			for (let t = 0; t < T - 1; t++) {
				sumGamma += gamma[t][i];
			}

			for (let j = 0; j < N; j++) {
				let sumXi = 0;
				for (let t = 0; t < T - 1; t++) {
					sumXi += xi[t][i][j];
				}

				this.transitions[i][j] = sumGamma > 0 ? sumXi / sumGamma : 1 / N;
			}
		}

		// Re-estimate emission probabilities
		for (let i = 0; i < N; i++) {
			let sumGamma = 0;
			for (let t = 0; t < T; t++) {
				sumGamma += gamma[t][i];
			}

			for (let j = 0; j < V; j++) {
				let sumGammaEmit = 0;
				for (let t = 0; t < T; t++) {
					if (this.tokenToIndex.get(tokens[t]) === j) {
						sumGammaEmit += gamma[t][i];
					}
				}

				this.emissions[i][j] = sumGamma > 0 ? sumGammaEmit / sumGamma : 1 / V;
			}
		}
	}

	/**
	 * Generate text from the HMM
	 * @param {GenerationContext} context - Generation parameters
	 * @returns {GenerationResult} - Generated text and metadata
	 */
	generate(context = new GenerationContext()) {
		const {
			max_tokens = 100,
			min_tokens = 50,
			stop_tokens = ['.', '!', '?'],
		} = context;

		if (!this.transitions || !this.emissions) {
			throw new Error('Model has not been trained');
		}

		const generatedTokens = [];
		let currentState = this.sampleInitialState(context.randomFn);

		for (let i = 0; i < max_tokens; i++) {
			// Generate token from current state
			const token = this.sampleEmission(currentState, context.randomFn);
			generatedTokens.push(token);

			// Check stop conditions
			if (i >= min_tokens - 1 && stop_tokens.includes(token)) {
				break;
			}

			// Transition to next state
			currentState = this.sampleNextState(currentState, context.randomFn);
		}

		const text = this.postProcess(generatedTokens);
		return new GenerationResult(text, {
			tokens: generatedTokens,
			length: generatedTokens.length,
			model: 'hmm',
			finish_reason: 'length',
		});
	}

	/**
	 * Sample initial state
	 * @param {Function} randomFn - Random number generator
	 * @returns {number} - Initial state index
	 */
	sampleInitialState(randomFn = random) {
		const r = randomFn();
		let cumProb = 0;

		for (let i = 0; i < this.numStates; i++) {
			cumProb += this.initial[i];
			if (r <= cumProb) {
				return i;
			}
		}

		return this.numStates - 1; // fallback
	}

	/**
	 * Sample next state given current state
	 * @param {number} currentState - Current state index
	 * @param {Function} randomFn - Random number generator
	 * @returns {number} - Next state index
	 */
	sampleNextState(currentState, randomFn = random) {
		const r = randomFn();
		let cumProb = 0;

		for (let i = 0; i < this.numStates; i++) {
			cumProb += this.transitions[currentState][i];
			if (r <= cumProb) {
				return i;
			}
		}

		return this.numStates - 1; // fallback
	}

	/**
	 * Sample emission from current state
	 * @param {number} state - Current state index
	 * @param {Function} randomFn - Random number generator
	 * @returns {string} - Generated token
	 */
	sampleEmission(state, randomFn = random) {
		const r = randomFn();
		let cumProb = 0;

		for (let i = 0; i < this.indexToToken.length; i++) {
			cumProb += this.emissions[state][i];
			if (r <= cumProb) {
				return this.indexToToken[i];
			}
		}

		return this.indexToToken[this.indexToToken.length - 1]; // fallback
	}

	/**
	 * Find most likely state sequence (Viterbi algorithm)
	 * @param {string[]} tokens - Input tokens
	 * @returns {string[]} - Most likely state sequence
	 */
	viterbi(tokens) {
		const T = tokens.length;
		const N = this.numStates;

		// Viterbi table and backpointer
		const viterbi = Array.from({ length: T }, () => new Array(N).fill(0));
		const backpointer = Array.from({ length: T }, () => new Array(N).fill(0));

		// Initialize
		const firstTokenIdx = this.tokenToIndex.get(tokens[0]);
		for (let i = 0; i < N; i++) {
			viterbi[0][i] = this.initial[i] * this.emissions[i][firstTokenIdx];
			backpointer[0][i] = 0;
		}

		// Recursion
		for (let t = 1; t < T; t++) {
			const tokenIdx = this.tokenToIndex.get(tokens[t]);

			for (let j = 0; j < N; j++) {
				let maxProb = 0;
				let bestState = 0;

				for (let i = 0; i < N; i++) {
					const prob = viterbi[t - 1][i] * this.transitions[i][j];
					if (prob > maxProb) {
						maxProb = prob;
						bestState = i;
					}
				}

				viterbi[t][j] = maxProb * this.emissions[j][tokenIdx];
				backpointer[t][j] = bestState;
			}
		}

		// Termination
		let bestPathProb = 0;
		let bestLastState = 0;
		for (let i = 0; i < N; i++) {
			if (viterbi[T - 1][i] > bestPathProb) {
				bestPathProb = viterbi[T - 1][i];
				bestLastState = i;
			}
		}

		// Backtrack
		const bestPath = new Array(T);
		bestPath[T - 1] = bestLastState;
		for (let t = T - 2; t >= 0; t--) {
			bestPath[t] = backpointer[t + 1][bestPath[t + 1]];
		}

		return bestPath.map((stateIdx) => this.indexToState[stateIdx]);
	}

	/**
	 * Post-process generated tokens into readable text
	 * @param {string[]} tokens - Generated tokens
	 * @returns {string} - Formatted text
	 */
	/**
	 * Post-process generated tokens into readable text
	 * @param {string[]} tokens - The tokens to process
	 * @returns {string} - The processed text
	 */
	postProcess(tokens) {
		if (tokens.length === 0) return '';

		let text = tokens.join(' ');

		// Basic punctuation cleanup
		text = text
			.replace(/\s+([.!?;:,'")\]}])/g, '$1')
			.replace(/([.!?;:,])(\w)/g, '$1 $2')
			.replace(/\s+(['"])/g, ' $1')
			.replace(/(['"()])\s+/g, '$1 ')
			.replace(/([.!?])\s+(\w)/g, (_, p, l) => `${p} ${l.toUpperCase()}`)
			.replace(/^\w/, (m) => m.toUpperCase())
			.replace(/\s+/g, ' ')
			.trim();

		return text;
	}

	/**
	 * @override
	 * @returns {Object} - Model statistics
	 */
	getStats() {
		return {
			modelType: this.modelType,
			numStates: this.numStates,
			vocabularySize: this.indexToToken.length,
			transitions: this.transitions ? this.transitions.length : 0,
			emissions: this.emissions ? this.emissions.length : 0,
		};
	}

	/**
	 * @override
	 * @returns {Object} - Serializable model data
	 */
	toJSON() {
		return {
			modelType: this.modelType,
			numStates: this.numStates,
			transitions: this.transitions,
			emissions: this.emissions,
			initial: this.initial,
			indexToToken: this.indexToToken,
			indexToState: this.indexToState,
		};
	}

	/**
	 * @override
	 * @param {Object} data - Serialized model data
	 */
	fromJSON(data) {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid JSON data');
		}

		this.modelType = data.modelType || 'hmm';
		this.numStates = data.numStates || 10;
		this.transitions = data.transitions || null;
		this.emissions = data.emissions || null;
		this.initial = data.initial || null;
		this.indexToToken = data.indexToToken || [];
		this.indexToState = data.indexToState || [];

		// Rebuild tokenToIndex and stateToIndex maps
		this.tokenToIndex = new Map();
		this.indexToToken.forEach((token, i) => this.tokenToIndex.set(token, i));

		this.stateToIndex = new Map();
		this.indexToState.forEach((state, i) => this.stateToIndex.set(state, i));
	}
}
