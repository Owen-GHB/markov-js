export class HelpHandler {
    static formatGeneralHelp(manifest) {
        let helpText = `🔗 ${manifest.name} - ${manifest.description}\n`;
        helpText += '='.repeat(Math.max(manifest.name.length + 2, 40)) + '\n\n';
        helpText += 'Available commands:\n';

        const sortedCommands = Object.values(manifest.commands).sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        for (const cmd of sortedCommands) {
            helpText += `${cmd.name}${this.formatParamsSignature(cmd)} - ${cmd.description}\n`;
        }

        helpText += '\nhelp([command]) - Show help information\n';
        helpText += 'exit() - Exit the program\n';
        helpText += '\nCommand Syntax:\n';
        helpText += '• Function style: command(param1, param2, key=value)\n';
        helpText += '• Object style: command({param1: value, key: value})\n';
        helpText += '• Simple style: command\n';

        return helpText;
    }

    static formatCommandHelp(cmd) {
        let helpText = `🔗 ${cmd.name}${this.formatParamsSignature(cmd)}\n`;
        helpText += '   ' + cmd.description + '\n\n';

        const requiredParams = cmd.parameters
            ? Object.entries(cmd.parameters)
                  .filter(([_, p]) => p.required)
                  .map(([name, param]) => ({ name, ...param }))
            : [];
        const optionalParams = cmd.parameters
            ? Object.entries(cmd.parameters)
                  .filter(([_, p]) => !p.required)
                  .map(([name, param]) => ({ name, ...param }))
            : [];

        if (requiredParams.length > 0) {
            helpText += '   Required:\n';
            for (const param of requiredParams) {
                helpText += `       ${param.name} - ${param.description}\n`;
            }
            helpText += '\n';
        }

        if (optionalParams.length > 0) {
            helpText += '   Options (key=value):\n';
            for (const param of optionalParams) {
                const defaultValue =
                    param.default !== undefined ? ` (default: ${param.default})` : '';
                const constraints = this.formatParamConstraints(param);
                const constraintText = constraints ? ` ${constraints}` : '';
                helpText += `       ${param.name}=${param.type}${defaultValue}${constraintText} - ${param.description}\n`;
            }
            helpText += '\n';
        }

        if (cmd.examples && cmd.examples.length > 0) {
            helpText += '   Examples:\n';
            for (const example of cmd.examples) {
                helpText += `       ${example}\n`;
            }
        }

        return helpText;
    }

    static formatParamsSignature(cmd) {
        if (!cmd.parameters || Object.keys(cmd.parameters).length === 0) {
            return '()';
        }

        const required = Object.entries(cmd.parameters)
            .filter(([_, p]) => p.required)
            .map(([name, param]) => ({ name, ...param }));
        const optional = Object.entries(cmd.parameters)
            .filter(([_, p]) => !p.required)
            .map(([name, param]) => ({ name, ...param }));

        const requiredStr = required.map((p) => p.name).join(', ');
        const optionalStr = optional.map((p) => `[${p.name}]`).join(', ');

        let paramsStr = '';
        if (required.length > 0 && optional.length > 0) {
            paramsStr = `${requiredStr}, ${optionalStr}`;
        } else if (required.length > 0) {
            paramsStr = requiredStr;
        } else if (optional.length > 0) {
            paramsStr = optionalStr;
        }

        return `(${paramsStr})`;
    }

    static formatParamConstraints(param) {
        const constraints = [];

        if (param.min !== undefined) {
            constraints.push(`min: ${param.min}`);
        }
        if (param.max !== undefined) {
            constraints.push(`max: ${param.max}`);
        }
        if (param.enum) {
            constraints.push(`one of: [${param.enum.join(', ')}]`);
        }

        return constraints.length > 0 ? `(${constraints.join(', ')})` : '';
    }

    static isHelpCommand(input) {
        const trimmed = input.trim().toLowerCase();
        return trimmed === 'help' || 
               trimmed === 'help()' || 
               trimmed.startsWith('help(');
    }

    static isExitCommand(input) {
        const trimmed = input.trim().toLowerCase();
        return trimmed === 'exit' || trimmed === 'exit()';
    }

    static getHelpCommandArgs(input) {
        const trimmed = input.trim();
        let args = {};
        
        if (trimmed.startsWith('help(') && trimmed.includes(')')) {
            const paramMatch = trimmed.match(/help\(\s*["']?([^"'\s)]+)["']?\s*\)/i);
            if (paramMatch && paramMatch[1]) {
                args = { command: paramMatch[1] };
            }
        }
        
        return args;
    }
}