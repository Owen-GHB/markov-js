// File: processor/parsers/Utils.js

export class ParserUtils {
  /**
   * Normalize a single value from string to appropriate type
   */
  static normalizeValue(value) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      let unquoted = trimmed;

      // Remove surrounding quotes
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        unquoted = trimmed.slice(1, -1);
      }

      // Try type detection
      if (/^-?\d+$/.test(unquoted)) {
        return parseInt(unquoted, 10);
      } else if (/^-?\d+\.\d+$/.test(unquoted)) {
        return parseFloat(unquoted);
      } else if (unquoted === 'true') {
        return true;
      } else if (unquoted === 'false') {
        return false;
      } else if (unquoted === 'null') {
        return null;
      } else if (unquoted === 'undefined') {
        return undefined;
      } else if (unquoted !== trimmed) {
        return unquoted; // Return unquoted string
      }
    }

    return value; // Return as-is if not string or no conversion needed
  }

  /**
   * Split key=value pairs with quote handling
   */
  static splitKeyValue(pair) {
    if (!pair.includes('=')) return [null, null];

    const eqIndex = pair.indexOf('=');
    const key = pair.slice(0, eqIndex).trim();
    const value = this.normalizeValue(pair.slice(eqIndex + 1).trim());

    return [key, value];
  }

  /**
   * Normalize all values in an args object
   */
  static normalizeArgs(args) {
    const result = {};
    for (const [key, value] of Object.entries(args)) {
      result[key] = this.normalizeValue(value);
    }
    return result;
  }

  /**
   * Validate command has required positional arguments
   */
  static validatePositionalArgs(args, requiredCount) {
    if (args.length < requiredCount) {
      throw new Error(`Requires at least ${requiredCount} arguments`);
    }
    for (let i = 0; i < requiredCount; i++) {
      if (args[i].includes('=')) {
        throw new Error(`Argument ${i + 1} must be positional`);
      }
    }
  }

  static isNullish(v) {
    return v === null || v === undefined || v === 'null';
  }

  /**
   * UNIVERSAL PARAMETER PROCESSING
   * This consolidates the duplicate logic from both parsers
   */

  /**
   * Process and validate parameters for any command
   */
  static processParameters(commandName, rawArgs, parameters, context = {}) {
    // Step 1: Apply runtime fallbacks
    const argsWithFallbacks = this.applyRuntimeFallbacks(rawArgs, parameters, context);
    
    // Step 2: Validate required parameters
    const requiredCheck = this.validateRequiredParameters(argsWithFallbacks, parameters);
    if (requiredCheck.error) return requiredCheck;
    
    // Step 3: Apply defaults
    const argsWithDefaults = this.applyDefaultValues(argsWithFallbacks, parameters);
    
    // Step 4: Type validation and normalization
    const validationResult = this.validateAndNormalizeTypes(argsWithDefaults, parameters);
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
   * Validate all required parameters are present
   */
  static validateRequiredParameters(args, parameters) {
    const missingParams = [];
    
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (paramSpec.required && args[paramName] === undefined) {
        missingParams.push(paramName);
      }
    }
    
    if (missingParams.length > 0) {
      return {
        error: `Missing required parameters: ${missingParams.join(', ')}`,
        args: null
      };
    }
    
    return { error: null, args };
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

  /**
   * Validate and normalize parameter types (INCLUDES BLOB SUPPORT)
   */
  static validateAndNormalizeTypes(args, parameters) {
    const validatedArgs = {};
    
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      const value = args[paramName];
      
      // Skip undefined optional parameters
      if (value === undefined && !paramSpec.required) continue;
      
      // NEW: Handle blob type
      if (paramSpec.type.includes('blob')) {
        const blobResult = this.processBlobParameter(value, paramSpec, paramName);
        if (blobResult.error) return blobResult;
        validatedArgs[paramName] = blobResult.value;
        continue;
      }
      
      // Handle standard types
      const typeResult = this.processStandardType(value, paramSpec, paramName);
      if (typeResult.error) return typeResult;
      validatedArgs[paramName] = typeResult.value;
    }
    
    return { error: null, args: validatedArgs };
  }

  /**
   * NEW: Process blob parameters
   */
  static processBlobParameter(value, paramSpec, paramName) {
    const normalized = this.normalizeBlobInput(value);
    const validation = this.validateBlob(normalized, paramSpec.constraints, paramName);
    
    if (!validation.isValid) {
      return { error: validation.error, value: null };
    }
    
    return { error: null, value: validation.normalizedValue };
  }

  /**
   * NEW: Normalize blob input from various formats
   */
  static normalizeBlobInput(input) {
    if (typeof input === 'string') {
      // Check if it's a data URL
      if (input.startsWith('data:')) {
        const matches = input.match(/^data:([^;]+);base64,(.*)$/);
        if (matches) {
          return {
            type: 'blob',
            mimeType: matches[1],
            data: Buffer.from(matches[2], 'base64'),
            encoding: 'base64',
            size: Buffer.from(matches[2], 'base64').length
          };
        }
      }
      
      // Check if it's plain base64
      if (input.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        return {
          type: 'blob',
          data: Buffer.from(input, 'base64'),
          encoding: 'base64',
          size: Buffer.from(input, 'base64').length
        };
      }
      
      // Assume file path
      return {
        type: 'filepath',
        path: input,
        name: input.split(/[\\/]/).pop()
      };
    }
    
    // Already processed or other type
    return input;
  }

  /**
   * NEW: Validate blob against constraints
   */
  static validateBlob(blob, constraints = {}, paramName) {
    const result = {
      isValid: true,
      normalizedValue: blob,
      error: null
    };

    // Size constraints
    if (constraints.maxSize && blob.size && blob.size > constraints.maxSize) {
      result.isValid = false;
      result.error = `Parameter ${paramName} exceeds maximum size: ${blob.size} > ${constraints.maxSize}`;
      return result;
    }

    // MIME type constraints
    if (constraints.allowedTypes && blob.mimeType) {
      if (!constraints.allowedTypes.includes(blob.mimeType)) {
        result.isValid = false;
        result.error = `Parameter ${paramName} type '${blob.mimeType}' not allowed. Allowed: ${constraints.allowedTypes.join(', ')}`;
        return result;
      }
    }

    // File extension constraints
    if (constraints.allowedExtensions && blob.name) {
      const ext = blob.name.split('.').pop()?.toLowerCase();
      if (ext && !constraints.allowedExtensions.includes(ext)) {
        result.isValid = false;
        result.error = `Parameter ${paramName} extension '.${ext}' not allowed. Allowed: ${constraints.allowedExtensions.map(e => '.' + e).join(', ')}`;
        return result;
      }
    }

    return result;
  }

  /**
   * Process standard types (consolidated from both parsers)
   */
  static processStandardType(value, paramSpec, paramName) {
    const types = paramSpec.type.split('|').map(t => t.trim());
    let parsedValue = value;
    let typeValidationPassed = false;

    // Try each type in the union until one succeeds
    for (const type of types) {
      try {
        if (type === 'integer') {
          const intValue = parseInt(value, 10);
          if (!isNaN(intValue)) {
            parsedValue = intValue;
            typeValidationPassed = true;
            
            // Range validation
            if (paramSpec.min !== undefined && parsedValue < paramSpec.min) {
              return {
                error: `Parameter ${paramName} must be at least ${paramSpec.min}`,
                value: null
              };
            }
            if (paramSpec.max !== undefined && parsedValue > paramSpec.max) {
              return {
                error: `Parameter ${paramName} must be at most ${paramSpec.max}`,
                value: null
              };
            }
            break;
          }
        } else if (type === 'number') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            parsedValue = numValue;
            typeValidationPassed = true;
            
            // Range validation
            if (paramSpec.min !== undefined && parsedValue < paramSpec.min) {
              return {
                error: `Parameter ${paramName} must be at least ${paramSpec.min}`,
                value: null
              };
            }
            if (paramSpec.max !== undefined && parsedValue > paramSpec.max) {
              return {
                error: `Parameter ${paramName} must be at most ${paramSpec.max}`,
                value: null
              };
            }
            break;
          }
        } else if (type === 'boolean') {
          if (typeof value === 'boolean') {
            parsedValue = value;
            typeValidationPassed = true;
            break;
          } else {
            const lowerValue = String(value).toLowerCase();
            if (lowerValue === 'true') {
              parsedValue = true;
              typeValidationPassed = true;
              break;
            } else if (lowerValue === 'false') {
              parsedValue = false;
              typeValidationPassed = true;
              break;
            }
          }
        } else if (type === 'array') {
          if (Array.isArray(value)) {
            parsedValue = value;
            typeValidationPassed = true;
            break;
          } else {
            try {
              const arrayValue = JSON.parse(value);
              if (Array.isArray(arrayValue)) {
                parsedValue = arrayValue;
                typeValidationPassed = true;
                break;
              }
            } catch {
              // Continue to next type
            }
          }
        } else if (type === 'string') {
          // Strings are always valid
          parsedValue = String(value);
          typeValidationPassed = true;
          break;
        } else if (type === 'object') {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            parsedValue = value;
            typeValidationPassed = true;
            break;
          } else {
            try {
              const objValue = JSON.parse(value);
              if (typeof objValue === 'object' && objValue !== null && !Array.isArray(objValue)) {
                parsedValue = objValue;
                typeValidationPassed = true;
                break;
              }
            } catch {
              // Continue to next type
            }
          }
        }
      } catch {
        // Continue to next type if this one fails
        continue;
      }
    }

    // If no type validation passed, return error
    if (!typeValidationPassed) {
      return {
        error: `Parameter ${paramName} must be of type: ${paramSpec.type}`,
        value: null
      };
    }

    // Enum validation (applies to all types)
    if (paramSpec.enum && !paramSpec.enum.includes(parsedValue)) {
      return {
        error: `Parameter ${paramName} must be one of: ${paramSpec.enum.join(', ')}`,
        value: null
      };
    }

    return { error: null, value: parsedValue };
  }

  /**
   * Find command in manifest by name (case-insensitive)
   */
  static findCommand(commandName, manifest) {
    return manifest.commands.find(
      cmd => cmd.name.toLowerCase() === commandName.toLowerCase()
    );
  }

  /**
   * Validate unknown parameters
   */
  static validateUnknownParameters(args, parameters) {
    for (const key of Object.keys(args)) {
      const paramName = Object.keys(parameters).find(
        p => p.toLowerCase() === key.toLowerCase()
      );
      if (!paramName) {
        return {
          error: `Unknown parameter: ${key}`,
          valid: false
        };
      }
    }
    return { error: null, valid: true };
  }
}