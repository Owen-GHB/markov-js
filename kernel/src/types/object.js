export default {
  name: 'object',
  
  accepts(value, spec) {
    return spec.type.includes('object');
  },
  
  validate(value, spec) {
    let objValue;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      objValue = value;
    } else if (typeof value === 'string') {
      try {
        objValue = JSON.parse(value);
      } catch {
        throw new TypeError(`Must be valid JSON object, got: ${value}`);
      }
      
      if (typeof objValue !== 'object' || objValue === null || Array.isArray(objValue)) {
        throw new TypeError(`Must be an object, got: ${value}`);
      }
    } else {
      throw new TypeError(`Must be an object, got: ${typeof value}`);
    }
    
    return objValue;
  },
  
  normalize(value, spec) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    
    throw new TypeError(`Cannot convert to object: ${typeof value}`);
  }
};