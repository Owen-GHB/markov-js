export class Required {
  static properties = ['required'];
  
  async preProcess(context) {
    const { command, commandSpec } = context;
    
    for (const [paramName, paramSpec] of Object.entries(commandSpec.parameters)) {
      if (paramSpec.required && command.args[paramName] === undefined) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
    }
    
    return context;
  }
}