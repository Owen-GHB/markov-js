// File: processor/parsers/ParameterNormalizer.js
import { ParameterValidator } from './ParameterValidator.js';

export class ParameterNormalizer {
  /**
   * Process and validate parameters for any command
   */
  static processParameters(commandName, rawArgs, parameters, context = {}) {
    // Step 1: Apply runtime fallbacks
    const argsWithFallbacks = this.applyRuntimeFallbacks(rawArgs, parameters, context);
    
    // Step 2: Validate required parameters
    const requiredCheck = ParameterValidator.validateRequiredParameters(argsWithFallbacks, parameters);
    if (requiredCheck.error) return requiredCheck;
    
    // Step 3: Apply defaults
    const argsWithDefaults = this.applyDefaultValues(argsWithFallbacks, parameters);
    
    // Step 4: Type validation and normalization
    const validationResult = ParameterValidator.validateTypes(argsWithDefaults, parameters);
    if (validationResult.error) return validationResult;
    
    return {
      error: null,
      args: validationResult.args
    };
  }

  /**
   * Apply runtime fallback values from state
   */
  static applyRuntimeFallbacks(args, parameters, context) {
    const result = { ...args };
    
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (result[paramName] === undefined && 
          paramSpec.runtimeFallback && 
          context.state && 
          context.state.has(paramSpec.runtimeFallback)) {
        result[paramName] = context.state.get(paramSpec.runtimeFallback);
      }
    }
    
    return result;
  }

  /**
   * Apply default values for optional parameters
   */
  static applyDefaultValues(args, parameters) {
    const result = { ...args };
    
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (result[paramName] === undefined && 
          !paramSpec.required && 
          paramSpec.default !== undefined) {
        result[paramName] = paramSpec.default;
      }
    }
    
    return result;
  }
}