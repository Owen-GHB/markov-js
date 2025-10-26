export class Template {
  static properties = ['successOutput'];
  
  // Make these methods static so State can use them
  static evaluateTemplate(template, contexts = {}) {
    const singleMatch = template.match(/^\{\{([^{}]+)\}\}$/);
    if (singleMatch) {
      const expression = singleMatch[1].trim();
      return this.getRawValue(expression, contexts);
    }
    
    return template.replace(/\{\{([^{}]+)\}\}/g, (_, expression) => {
      const trimmed = expression.trim();
      const rawValue = this.getRawValue(trimmed, contexts);
      if (rawValue === undefined) return '';
      
      if (typeof rawValue === 'object' && rawValue !== null) {
        return JSON.stringify(rawValue);
      }
      return String(rawValue);
    });
  }

  static getRawValue(expression, contexts = {}) {
    if (expression.includes('.')) {
      const [contextName, ...pathParts] = expression.split('.');
      const path = pathParts.join('.');
      const context = contexts[contextName];
      if (context === undefined) return undefined;
      return this.getNestedValue(context, path);
    }
    
    if (contexts[expression] !== undefined) {
      return contexts[expression];
    }
    
    for (const contextName in contexts) {
      const context = contexts[contextName];
      if (context && typeof context === 'object' && context[expression] !== undefined) {
        return context[expression];
      }
    }
    
    return undefined;
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current instanceof Map) return current.get(key);
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  static evaluateConditional(expression, contexts = {}) {
    try {
      const resolvedExpression = this.evaluateTemplate(expression, contexts);
      const operators = ['==', '!=', '>', '<'];
      let foundOperator = null;

      for (const op of operators) {
        if (resolvedExpression.includes(op)) {
          foundOperator = op;
          break;
        }
      }

      if (!foundOperator) {
        const expr = this.normalizeConditionalValue(resolvedExpression);
        return Boolean(expr);
      }

      const [leftStr, rightStr] = resolvedExpression
        .split(foundOperator)
        .map((part) => part.trim());

      if (!leftStr || !rightStr) return false;

      const left = this.normalizeConditionalValue(leftStr);
      const right = this.normalizeConditionalValue(rightStr);

      switch (foundOperator) {
        case '==': return left == right;
        case '!=': return left != right;
        case '>': return left > right;
        case '<': return left < right;
        default: return false;
      }
    } catch (error) {
      return false;
    }
  }

  static normalizeConditionalValue(value) {
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'null') return null;
    if (value.toLowerCase() === 'undefined') return undefined;
    return value;
  }

  /**
   * Instance method for processor interface
   */
  async postProcess(context) {
    const { command, commandSpec, result } = context;
    
    if (commandSpec?.successOutput) {
      const templateContext = {
        input: command.args,
        output: result,
        state: context.state,
        original: command.args,
        originalCommand: command.name,
      };
      
      return {
        ...context,
        result: this.constructor.evaluateTemplate(
          commandSpec.successOutput,
          templateContext
        )
      };
    }
    
    return context;
  }
}