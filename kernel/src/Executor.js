import { Processor } from './Processor.js';
import { Evaluator } from './Evaluator.js';
import { Runner } from './Runner.js';
import { StateManager } from './StateManager.js';
import { manifestReader } from './manifestReader.js';

export class Executor {
    constructor(commandRoot, projectRoot, contextFilePath = null) {
        this.commandRoot = commandRoot;
        this.projectRoot = projectRoot;
        this.contextFilePath = contextFilePath;
        
        // Initialize core components
        this.manifest = manifestReader(commandRoot);
        this.runner = new Runner(commandRoot, projectRoot);
        
        // Load state if context file provided
        this.state = contextFilePath 
            ? StateManager.loadState(contextFilePath, this.manifest)
            : StateManager.createState(this.manifest);
    }

    async executeCommand(input, template = null) {
        const processedInput = Processor.processInput(input, this.manifest);
        const commandSpec = this.manifest.commands[processedInput.name];
        const processedArgs = StateManager.applyState(
          processedInput.args,
          commandSpec.parameters,
          this.state,
        );
        const command = {
          name:processedInput.name,
          args:processedArgs
        };

        // Execute command chain (runner handles recursion)
        let result = await this.runner.runCommand(
            command,
            commandSpec,
            this.state
        );

        // Build template context for side effects
        const templateContext = {
            input: command.args,
            output: result,
            state: this.state,
        };

        // Apply side effects
        this.state = StateManager.applySideEffects(
            command,
            commandSpec,
            this.state,
            templateContext,
        );
        
        // Apply template if specified
        if (template && commandSpec?.[template]) {
            const templateContext = {
                input: command.args,
                output: result,
                state: this.state,
                original: command.args,
                originalCommand: command.name
            };
            result = Evaluator.evaluateTemplate(commandSpec[template], templateContext);
        }
        
        // Save state if we have a context file
        if (this.contextFilePath) {
            StateManager.saveState(this.state, this.contextFilePath, this.manifest);
        }      
        return result;
    }
}