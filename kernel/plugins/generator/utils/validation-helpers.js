/**
 * Helper functions for client-side validation based on manifest constraints
 */
export class ValidationHelpers {
  /**
   * Validate a single parameter value against its manifest definition
   * @param {*} value - Value to validate
   * @param {Object} paramManifest - Parameter manifest definition
   * @param {Object} state - Current state for runtime fallbacks
   * @returns {Object} Validation result with isValid boolean and optional error message
   */
  static validateParam(value, paramManifest, state = {}) {
    // Handle undefined values for optional parameters
    if (value === undefined || value === null) {
      if (paramManifest.required) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' is required`
        };
      }
      return { isValid: true };
    }

    // Type validation
    if (paramManifest.type) {
      const typeValidation = this.validateType(value, paramManifest.type);
      if (!typeValidation.isValid) {
        return typeValidation;
      }
    }

    // Range validation for numbers
    if (this.isNumericType(paramManifest.type)) {
      if (paramManifest.min !== undefined && Number(value) < paramManifest.min) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' must be at least ${paramManifest.min}`
        };
      }
      if (paramManifest.max !== undefined && Number(value) > paramManifest.max) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' must be at most ${paramManifest.max}`
        };
      }
    }

    // Enum validation
    if (paramManifest.enum && !paramManifest.enum.includes(value)) {
      return {
        isValid: false,
        error: `Parameter '${paramManifest.name}' must be one of: ${paramManifest.enum.join(', ')}`
      };
    }

    // Length validation for strings
    if (paramManifest.type === 'string') {
      if (paramManifest.minLength !== undefined && String(value).length < paramManifest.minLength) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' must be at least ${paramManifest.minLength} characters long`
        };
      }
      if (paramManifest.maxLength !== undefined && String(value).length > paramManifest.maxLength) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' must be at most ${paramManifest.maxLength} characters long`
        };
      }
    }

    // Pattern validation for strings
    if (paramManifest.type === 'string' && paramManifest.pattern) {
      const regex = new RegExp(paramManifest.pattern);
      if (!regex.test(String(value))) {
        return {
          isValid: false,
          error: `Parameter '${paramManifest.name}' does not match required pattern`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate a value against its type specification
   * @param {*} value - Value to validate
   * @param {string} typeSpec - Type specification (e.g. 'string', 'integer|number')
   * @returns {Object} Validation result
   */
  static validateType(value, typeSpec) {
    // Handle union types (e.g. 'string|integer')
    if (typeSpec.includes('|')) {
      const types = typeSpec.split('|').map(t => t.trim());
      for (const type of types) {
        if (this.validateSingleType(value, type).isValid) {
          return { isValid: true };
        }
      }
      return {
        isValid: false,
        error: `Value does not match any of the allowed types: ${typeSpec}`
      };
    }

    // Single type validation
    return this.validateSingleType(value, typeSpec);
  }

  /**
   * Validate a value against a single type
   * @param {*} value - Value to validate
   * @param {string} type - Single type (e.g. 'string', 'integer')
   * @returns {Object} Validation result
   */
  static validateSingleType(value, type) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            isValid: false,
            error: `Expected string, got ${typeof value}`
          };
        }
        break;
        
      case 'integer':
        // Handle string numbers by converting them
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue !== 'number' || !Number.isInteger(numValue)) {
          return {
            isValid: false,
            error: `Expected integer, got ${value} (${typeof value})`
          };
        }
        break;
        
      case 'number':
        // Handle string numbers by converting them
        const numberValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numberValue !== 'number' || isNaN(numberValue)) {
          return {
            isValid: false,
            error: `Expected number, got ${value} (${typeof value})`
          };
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          // Accept string representations of boolean
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue !== 'true' && lowerValue !== 'false') {
              return {
                isValid: false,
                error: `Expected boolean, got string "${value}"`
              };
            }
          } else {
            return {
              isValid: false,
              error: `Expected boolean, got ${typeof value}`
            };
          }
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          // Accept string representations of arrays (comma-separated)
          if (typeof value === 'string') {
            try {
              // Try parsing as JSON array first
              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) {
                return {
                  isValid: false,
                  error: `Expected array, got ${typeof value}`
                };
              }
            } catch (e) {
              // If not valid JSON, we'll treat it as a comma-separated string for now
              // The actual conversion might happen later
            }
          } else {
            return {
              isValid: false,
              error: `Expected array, got ${typeof value}`
            };
          }
        }
        break;
        
      default:
        // For unknown types, we'll be permissive
        break;
    }
    
    return { isValid: true };
  }

  /**
   * Check if a type specification is numeric
   * @param {string} typeSpec - Type specification
   * @returns {boolean} True if type is numeric
   */
  static isNumericType(typeSpec) {
    if (!typeSpec) return false;
    if (typeSpec.includes('|')) {
      const types = typeSpec.split('|').map(t => t.trim());
      return types.some(t => t === 'integer' || t === 'number');
    }
    return typeSpec === 'integer' || typeSpec === 'number';
  }

  /**
   * Validate all parameters for a command
   * @param {Object} args - Command arguments
   * @param {Array} paramManifests - Array of parameter manifests
   * @param {Object} state - Current state
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  static validateCommand(args, paramManifests, state = {}) {
    const errors = [];
    
    // Check for required parameters
    for (const param of paramManifests) {
      if (param.required) {
        // Use runtime fallback if value is not provided
        if (args[param.name] === undefined && param.runtimeFallback) {
          args[param.name] = state[param.runtimeFallback];
        }
        
        if (args[param.name] === undefined) {
          errors.push(`Missing required parameter: ${param.name}`);
        }
      }
    }
    
    // Validate each provided argument
    for (const [paramName, value] of Object.entries(args)) {
      const paramManifest = paramManifests.find(p => p.name === paramName);
      
      if (paramManifest) {
        const validation = this.validateParam(value, paramManifest, state);
        if (!validation.isValid) {
          errors.push(validation.error);
        }
      }
      // If parameter is not defined in manifest, that might be an error depending on the implementation
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}