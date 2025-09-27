import { CommandParser } from './kernel/CommandParser.js';

const parser = new CommandParser();

// Test various forms of listModels command
const testCases = [
  'listModels',
  'listModels ',
  'listModels()',
  'listModels() ',
  'listModels( )',
  'help',
  'exit'
];

console.log('Testing various simple commands:');
testCases.forEach(test => {
  console.log(`\nInput: "${test}"`);
  const result = parser.parse(test);
  console.log(JSON.stringify(result, null, 2));
});