export default {
  name: 'number',
  
  accepts(value, spec) {
    return spec.type.includes('number');
  },
  
  validate(value, spec) {
    const num = parseFloat(value);
    if (isNaN(num)) throw new TypeError(`Must be a number, got: ${value}`);
    
    if (spec.min !== undefined && num < spec.min) {
      throw new RangeError(`Must be at least ${spec.min}, got: ${num}`);
    }
    if (spec.max !== undefined && num > spec.max) {
      throw new RangeError(`Must be at most ${spec.max}, got: ${num}`);
    }
    
    return num;
  },
  
  normalize(value, spec) {
    return parseFloat(value);
  }
};