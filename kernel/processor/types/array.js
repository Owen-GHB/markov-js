export default {
  name: 'array',
  
  accepts(value, spec) {
    return spec.type.includes('array');
  },
  
  validate(value, spec) {
    let arrayValue;
    
    if (Array.isArray(value)) {
      arrayValue = value;
    } else if (typeof value === 'string') {
      try {
        arrayValue = JSON.parse(value);
      } catch {
        // Try comma-separated values as fallback
        arrayValue = value.split(',').map(v => v.trim()).filter(v => v);
      }
      
      if (!Array.isArray(arrayValue)) {
        throw new TypeError(`Must be an array, got: ${value}`);
      }
    } else {
      throw new TypeError(`Must be an array, got: ${typeof value}`);
    }
    
    return arrayValue;
  },
  
  normalize(value, spec) {
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(v => v.trim()).filter(v => v);
      }
    }
    
    throw new TypeError(`Cannot convert to array: ${typeof value}`);
  }
};