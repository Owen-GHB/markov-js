#!/usr/bin/env node

import { CommandParser } from './CommandParser.js';
import { AppInterface } from './Handler.js';

export class MarkovCLI {
    constructor() {
        this.parser = new CommandParser();
        this.handler = new AppInterface();
    }

    async run(args) {
        if (args.length === 0 || args[0].toLowerCase() === 'help') {
            return this.showHelp();
        }

        // Handle both direct args and REPL-style commands
        let commandStr;
        if (args.length === 1 && (args[0].includes('(') || args[0].includes('{'))) {
            // REPL-style command (e.g., 'generate("model.json")')
            commandStr = args[0];
        } else {
            // Shell-friendly args (e.g., generate model.json length=50)
            const command = args[0];
            const params = args.slice(1).map(p => {
                // Handle quoted values
                if (p.includes('=') && !p.startsWith('"') && !p.startsWith("'")) {
                    const [key, ...values] = p.split('=');
                    return `${key}="${values.join('=')}"`;
                }
                return p;
            });
            commandStr = `${command}(${params.join(', ')})`;
        }

        const { error, command } = this.parser.parse(commandStr);
        
        if (error) {
            console.error(`❌ ${error}`);
            this.showHelp();
            process.exit(1);
        }

        // Special handling for generate command to ensure modelName is set
        if (command.name === 'generate' && !command.args.modelName && command.args.model) {
            command.args.modelName = command.args.model;
        }

        const result = await this.handler.handleCommand(command);
        
        if (result.error) {
            console.error(`❌ ${result.error}`);
            process.exit(1);
        }

        if (result.output) {
            console.log(result.output);
        }
    }

    showHelp() {
        console.log(this.handler.getHelpText());
        console.log('\nCommand Line Usage:');
        console.log('  markov-cli <command> [args...]');
        console.log('  markov-cli \'command("param", key=value)\'');
        console.log('\nExamples:');
        console.log('  markov-cli generate sample.json length=50 temperature=0.8');
        console.log('  markov-cli \'generate("sample.json", length=50, temperature=0.8)\'');
        console.log('  markov-cli listModels');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const cli = new MarkovCLI();
    cli.run(process.argv.slice(2));
}