export class Normalizer {
  /**
   * Pure normalization - no validation, just transformation
   * Assumes arguments have already been validated
   */
  static normalizeAll(args, parameters, context = {}) {
    const normalized = { ...args };
    
    // Step 1: Apply runtime fallbacks
    this.applyRuntimeFallbacks(normalized, parameters, context);
    
    // Step 2: Apply default values
    this.applyDefaultValues(normalized, parameters);
    
    return { error: null, args: normalized };
  }

  static applyRuntimeFallbacks(args, parameters, context) {
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (args[paramName] === undefined && 
          paramSpec.runtimeFallback && 
          context.state && 
          context.state.has(paramSpec.runtimeFallback)) {
        args[paramName] = context.state.get(paramSpec.runtimeFallback);
      }
    }
  }

  static applyDefaultValues(args, parameters) {
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (args[paramName] === undefined && 
          !paramSpec.required && 
          paramSpec.default !== undefined) {
        args[paramName] = paramSpec.default;
      }
    }
  }
}