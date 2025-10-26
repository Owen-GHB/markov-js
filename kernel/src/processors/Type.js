// Import all type handlers (we'll need to get these from the existing types directory)
import blobType from '../types/blob.js';
import bufferType from '../types/buffer.js';
import integerType from '../types/integer.js';
import numberType from '../types/number.js';
import booleanType from '../types/boolean.js';
import arrayType from '../types/array.js';
import objectType from '../types/object.js';
import stringType from '../types/string.js';
import localPathType from '../types/localPath.js';

export class Type {
  static properties = ['type'];
  
  // Recreate the type system from Validator
  static types = {
    blob: blobType,
    buffer: bufferType,
    integer: integerType,
    number: numberType,
    boolean: booleanType,
    array: arrayType,
    object: objectType,
    string: stringType,
    localPath: localPathType,
  };

  static typeOrder = Object.keys(this.types);

  async preProcess(context) {
    const { command, commandSpec } = context;
    
    const validatedArgs = this.validateAll(
      command.name,
      command.args,
      commandSpec.parameters
    );
    
    return {
      ...context,
      command: { ...command, args: validatedArgs }
    };
  }

  /**
   * Complete inlining of Validator.validateAll
   */
  validateAll(commandName, args, parameters) {
    this.validateUnknownParameters(args, parameters);
    const validatedArgs = {};

    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      const value = this.validateParameter(paramName, args[paramName], paramSpec);
      if (value !== undefined) {
        validatedArgs[paramName] = value;
      }
    }

    return validatedArgs;
  }

  validateParameter(paramName, value, paramSpec) {
    if (value === undefined && !paramSpec.required) {
      return undefined;
    }

    if (value === undefined && paramSpec.required) {
      throw new Error(`Missing required parameter: ${paramName}`);
    }

    const handler = this.findTypeHandler(value, paramSpec);
    const normalizedValue = handler.validate(value, paramSpec);

    if (paramSpec.enum && !paramSpec.enum.includes(normalizedValue)) {
      throw new Error(
        `Parameter ${paramName} must be one of: ${paramSpec.enum.join(', ')}`,
      );
    }

    return normalizedValue;
  }

  findTypeHandler(value, spec) {
    for (const typeName of this.constructor.typeOrder) {
      const handler = this.constructor.types[typeName];
      if (handler && handler.accepts(value, spec)) {
        return handler;
      }
    }
    throw new Error(`No type handler found for type: ${spec.type}`);
  }

  validateUnknownParameters(args, parameters) {
    for (const key of Object.keys(args)) {
      const paramName = Object.keys(parameters).find(
        (p) => p.toLowerCase() === key.toLowerCase(),
      );
      if (!paramName) {
        throw new Error(`Unknown parameter: ${key}`);
      }
    }
  }
}