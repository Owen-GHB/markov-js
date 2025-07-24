export const Tokenizers = {
  word: (text) => text.match(/\w+|[^\w\s]/g) || [],
  sentence: (text) => text.split(/[.!?]+/).map(s => s.trim())
};

export class Normalizers {
  static whitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }
}
