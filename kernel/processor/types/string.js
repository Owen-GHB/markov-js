export default {
  name: 'string',
  
  accepts(value, spec) {
    return spec.type.includes('string');
  },
  
  validate(value, spec) {
    // Strings are always valid, but check enum if present
    const strValue = String(value);
    
    if (spec.enum && !spec.enum.includes(strValue)) {
      throw new TypeError(`Must be one of: ${spec.enum.join(', ')}, got: ${strValue}`);
    }
    
    return strValue;
  },
  
  normalize(value, spec) {
    return String(value);
  }
};