import { CommandParser } from './kernel/CommandParser.js';

const parser = new CommandParser();

// Test simple command without arguments
console.log('Testing "listModels":');
const result1 = parser.parse('listModels');
console.log(JSON.stringify(result1, null, 2));

console.log('\nTesting "listModels()":');
const result2 = parser.parse('listModels()');
console.log(JSON.stringify(result2, null, 2));