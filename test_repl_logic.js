import { CommandParser } from './src/interpreter/CommandParser.js';
import { CommandHandler } from './src/interpreter/CommandHandler.js';

async function testReplLogic() {
  const parser = new CommandParser();
  const handler = new CommandHandler();
  
  const testInput = 'listModels';
  console.log(`Testing input: "${testInput}"`);
  
  // Simulate what REPL does
  const parsed = parser.parse(testInput);
  console.log('Parsed result:', JSON.stringify(parsed, null, 2));
  
  if (parsed.error) {
    console.log(`Error: ${parsed.error}`);
    return;
  }
  
  const result = await handler.handleCommand(parsed.command);
  console.log('Handler result:', JSON.stringify(result, null, 2));
  
  if (result.error) {
    console.log(`Handler Error: ${result.error}`);
  }
  if (result.output) {
    console.log(`Output: ${result.output}`);
  }
}

testReplLogic().catch(console.error);