/**
 * Generic formatter to convert objects to formatted strings
 * Provides reasonable default formatting for various data types
 */

/**
 * Format a result (object, array, primitive, etc.) into a human-readable string
 * @param {*} result - The result to format
 * @returns {string} - The formatted string
 */
export function formatResult(result) {
  if (result === null) {
    return 'null';
  }
  
  if (result === undefined) {
    return 'undefined';
  }
  
  if (typeof result === 'string') {
    return result;
  }
  
  if (typeof result === 'number' || typeof result === 'boolean') {
    return String(result);
  }
  
  if (Array.isArray(result)) {
    return formatArray(result);
  }
  
  if (typeof result === 'object') {
    return formatObject(result);
  }
  
  // For any other type, convert to string
  return String(result);
}

/**
 * Format an array into a human-readable string
 * @param {Array} arr - The array to format
 * @returns {string} - The formatted string
 */
function formatArray(arr) {
  if (arr.length === 0) {
    return '(empty array)';
  }
  
  return arr.map((item, index) => {
    const formattedItem = formatResult(item);
    return `${index + 1}. ${formattedItem}`;
  }).join('\n\n'); // Double newline to separate complex array items
}

/**
 * Format an object into a human-readable string
 * @param {Object} obj - The object to format
 * @returns {string} - The formatted string
 */
function formatObject(obj) {
  // Special handling for objects that have common patterns
  if (obj.success !== undefined) {
    return formatSuccessObject(obj);
  }
  
  if (obj.error) {
    return formatErrorObject(obj);
  }
  
  // For generic objects, use formatted key-value pairs
  const entries = Object.entries(obj);
  
  if (entries.length === 0) {
    return '{}';
  }
  
  // Format key-value pairs
  const formattedEntries = entries.map(([key, value]) => {
    const formattedValue = formatResult(value);
    // Capitalize the key for readability
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    return `${capitalizedKey}: ${formattedValue}`;
  });
  
  return formattedEntries.join('\n');
}

/**
 * Format a success object (with success, action, type, etc.)
 * @param {Object} obj - The success object to format 
 * @returns {string} - The formatted string
 */
function formatSuccessObject(obj) {
  const { success, action, type, name, message, ...rest } = obj;
  
  if (!success) {
    // This is actually an error disguised as a success object
    return obj.message || 'Operation failed';
  }
  
  const parts = [];
  
  if (action && type && name) {
    parts.push(`Operation: ${action} ${type} '${name}'`);
  } else if (action && type) {
    parts.push(`Operation: ${action} ${type}`);
  } else if (action) {
    parts.push(`Operation: ${action}`);
  }
  
  if (message) {
    parts.push(message);
  } else {
    parts.push('Operation completed successfully');
  }
  
  // Add any remaining properties
  const remainingEntries = Object.entries(rest);
  if (remainingEntries.length > 0) {
    const remainingFormatted = remainingEntries.map(([key, value]) => {
      const formattedValue = formatResult(value);
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      return `${capitalizedKey}: ${formattedValue}`;
    });
    parts.push(...remainingFormatted);
  }
  
  return parts.join('\n');
}

/**
 * Format an error object
 * @param {Object} obj - The error object to format
 * @returns {string} - The formatted string
 */
function formatErrorObject(obj) {
  if (obj.error) {
    return `Error: ${obj.error}`;
  }
  
  return 'Error occurred';
}