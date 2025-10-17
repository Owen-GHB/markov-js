export default {
  name: 'boolean',
  
  accepts(value, spec) {
    return spec.type.includes('boolean');
  },
  
  validate(value, spec) {
    if (typeof value === 'boolean') return value;
    
    const strValue = String(value).toLowerCase();
    if (strValue === 'true') return true;
    if (strValue === 'false') return false;
    
    throw new TypeError(`Must be a boolean, got: ${value}`);
  },
  
  normalize(value, spec) {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  }
};