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
   * Find command in manifest by name (case-insensitive)
   */
  static findCommand(commandName, manifest) {
    return manifest.commands.find(
      cmd => cmd.name.toLowerCase() === commandName.toLowerCase()
    );
  }
}