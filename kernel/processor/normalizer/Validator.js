export class Validator {
  /**
   * Comprehensive validation - pure validation only
   */
  static validateAll(commandName, args, parameters) {
    // 1. Check for unknown parameters
    const unknownCheck = this.validateUnknownParameters(args, parameters);
    if (unknownCheck.error) return unknownCheck;
    
    // 2. Check required parameters
    const requiredCheck = this.validateRequiredParameters(args, parameters);
    if (requiredCheck.error) return requiredCheck;
    
    // 3. Validate types and constraints
    const typeCheck = this.validateTypes(args, parameters);
    if (typeCheck.error) return typeCheck;
    
    return { error: null, args: typeCheck.args };
  }

  /**
   * Validate unknown parameters (security check)
   */
  static validateUnknownParameters(args, parameters) {
    for (const key of Object.keys(args)) {
      const paramName = Object.keys(parameters).find(
        p => p.toLowerCase() === key.toLowerCase()
      );
      if (!paramName) {
        return {
          error: `Unknown parameter: ${key}`,
          args: null
        };
      }
    }
    return { error: null, args };
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
   * Validate parameter types
   */
  static validateTypes(args, parameters) {
    const validatedArgs = {};
    
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      const value = args[paramName];
      
      // Skip undefined optional parameters
      if (value === undefined && !paramSpec.required) continue;
      
      // Handle blob type
      if (paramSpec.type.includes('blob')) {
        const blobResult = this.validateBlobParameter(value, paramSpec, paramName);
        if (blobResult.error) return blobResult;
        validatedArgs[paramName] = blobResult.value;
        continue;
      }
      
      // Handle standard types
      const typeResult = this.validateStandardType(value, paramSpec, paramName);
      if (typeResult.error) return typeResult;
      validatedArgs[paramName] = typeResult.value;
    }
    
    return { error: null, args: validatedArgs };
  }

  /**
   * Validate blob parameters
   */
  static validateBlobParameter(value, paramSpec, paramName) {
    const normalized = this.normalizeBlobInput(value);
    const validation = this.validateBlob(normalized, paramSpec.constraints, paramName);
    
    if (!validation.isValid) {
      return { error: validation.error, value: null };
    }
    
    return { error: null, value: validation.normalizedValue };
  }

  /**
   * Validate blob against constraints
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
   * Validate standard types
   */
  static validateStandardType(value, paramSpec, paramName) {
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
        } else if (type === 'buffer') {
          try {
            // Use the dedicated buffer normalization
            parsedValue = this.normalizeBufferInput(value);
            typeValidationPassed = true;
            
            // Add Buffer-specific constraints
            if (paramSpec.maxSize && parsedValue.length > paramSpec.maxSize) {
              return {
                error: `Parameter ${paramName} exceeds maximum size: ${parsedValue.length} > ${paramSpec.maxSize}`,
                value: null
              };
            }
            
            if (paramSpec.minSize && parsedValue.length < paramSpec.minSize) {
              return {
                error: `Parameter ${paramName} below minimum size: ${parsedValue.length} < ${paramSpec.minSize}`,
                value: null
              };
            }
            
            break;
          } catch (error) {
            // If normalization fails, continue to next type in union
            continue;
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

  static normalizeBufferInput(input) {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    
    if (typeof input === 'string') {
      // Handle base64 strings
      if (this.looksLikeBase64(input)) {
        return Buffer.from(input, 'base64');
      }
      // Handle hex strings
      if (this.looksLikeHex(input)) {
        return Buffer.from(input, 'hex');
      }
      // Default to utf8
      return Buffer.from(input, 'utf8');
    }
    
    if (Array.isArray(input)) {
      return Buffer.from(input);
    }
    
    if (input && typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {
      return Buffer.from(input.data);
    }
    
    throw new Error(`Cannot convert input to Buffer: ${typeof input}`);
  }

  static looksLikeBase64(str) {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0;
  }

  static looksLikeHex(str) {
    return /^[0-9A-Fa-f]+$/.test(str);
  }

  /**
   * Normalize blob input from various formats
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

    // Handle Buffer objects (from HTTP multipart)
    if (input && typeof input === 'object' && input.data && input.data.type === 'Buffer' && Array.isArray(input.data.data)) {
      return {
        ...input,
        data: Buffer.from(input.data.data),
        encoding: input.encoding || 'binary',
        size: input.size || input.data.data.length
      };
    }
    
    // Handle array input (common from multipart form data)
    if (Array.isArray(input)) {
      return {
        type: 'blob',
        data: Buffer.from(input),
        encoding: 'binary',
        size: input.length
      };
    }
    
    // Handle case where input is already an object but data is an array
    if (input && typeof input === 'object' && Array.isArray(input.data)) {
      return {
        ...input,
        data: Buffer.from(input.data),
        encoding: input.encoding || 'binary',
        size: input.size || input.data.length
      };
    }
    
    // Handle case where input is already an object but needs data conversion
    if (input && typeof input === 'object' && input.data) {
      // If data is a string, convert to buffer
      if (typeof input.data === 'string') {
        return {
          ...input,
          data: Buffer.from(input.data, input.encoding || 'utf8'),
          encoding: input.encoding || 'utf8',
          size: input.size || input.data.length
        };
      }
      // If data is already a buffer, ensure encoding is set
      if (Buffer.isBuffer(input.data)) {
        return {
          ...input,
          encoding: input.encoding || 'binary',
          size: input.size || input.data.length
        };
      }
    }
    
    // Already processed or other type
    return input;
  }
}