export class Default {
  static properties = ['default', 'required'];
  
  async preProcess(context) {
    const { command, commandSpec } = context;
    const normalized = { ...command.args };
    
    for (const [paramName, paramSpec] of Object.entries(commandSpec.parameters)) {
      if (normalized[paramName] === undefined && 
          !paramSpec.required && 
          paramSpec.default !== undefined) {
        normalized[paramName] = paramSpec.default;
      }
    }
    
    return {
      ...context,
      command: { ...command, args: normalized }
    };
  }
}