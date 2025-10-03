import fs from 'fs';
import path from 'path';
import { GENERATOR_CONSTANTS } from './constants.js';
import { StringBuilder } from './builders/string-builder.js';
import { NumberBuilder } from './builders/number-builder.js';
import { BooleanBuilder } from './builders/boolean-builder.js';
import { EnumBuilder } from './builders/enum-builder.js';
import { ArrayBuilder } from './builders/array-builder.js';
import { UnionBuilder } from './builders/union-builder.js';

/**
 * Main UI Generator class that creates a complete SPA from contract manifests
 */
export class UI {
  constructor() {
    this.constants = GENERATOR_CONSTANTS;
    this.builders = {
      'string': StringBuilder,
      'integer': NumberBuilder,
      'number': NumberBuilder,
      'boolean': BooleanBuilder,
      'array': ArrayBuilder,
    };
  }

  /**
   * Generate the complete SPA from manifests
   * @param {Object} manifest - The contract manifest with global and command information
   * @param {string} outputDir - Path to the output directory
   * @param {string} templateDir - Path to the templates directory
   * @param {string} outputFile - Name of the output file
   */
  async generate(manifest, outputDir = './generated-ui', templateDir = './templates', outputFile = 'index.html') {
    try {
      // Check if templates directory exists
      if (!fs.existsSync(templateDir)) {
        throw new Error(`Templates directory does not exist: ${templateDir}. UI generation requires templates to be present in the specified templates directory.`);
      }
      
      // Check if templates directory is empty
      const templateFiles = fs.readdirSync(templateDir);
      if (templateFiles.length === 0) {
        throw new Error(`Templates directory is empty: ${templateDir}. UI generation requires template files to be present for proper generation.`);
      }
      
      console.log('Starting UI generation...');
      
      // Use the provided manifest directly
      const globalManifest = manifest;
      const commandManifests = manifest.commands || [];
      console.log(`Using provided manifest with ${commandManifests.length} command manifests`);
      
      // Read optional CSS from templates directory
      const cssContent = this.readCSSFromTemplates(templateDir);
      
      // Initialize state from global manifest
      const initialState = globalManifest.stateDefaults || {};
      
      // Generate all command forms
      const commandForms = commandManifests.map(cmd => this.generateCommandForm(cmd, initialState, templateDir));
      
      // Ensure output directory exists
      // If outputDir is an absolute path, use it directly; otherwise continue as is
      let outputPath = outputDir;
      
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }
      
      // Generate separate files (HTML, CSS, and JS)
      const html = await this.generateSeparateFiles(globalManifest, commandManifests, commandForms, cssContent, outputPath, templateDir);
      
      // Write the HTML file
      const htmlFilePath = path.join(outputPath, outputFile);
      fs.writeFileSync(htmlFilePath, html);
      
      console.log(`Generated UI written to: ${htmlFilePath}`);
      console.log('UI generation completed successfully!');
    } catch (error) {
      console.error('Error during UI generation:', error);
      throw error;
    }
  }

  /**
   * Get CSS content from the templates directory
   * @param {string} templateDir - Path to the templates directory
   * @returns {string|null} CSS content if file exists, null otherwise
   */
  readCSSFromTemplates(templateDir) {
    const cssPath = path.join(templateDir, 'global.css');
    
    if (fs.existsSync(cssPath)) {
      return fs.readFileSync(cssPath, 'utf8');
    }
    return null;
  }

  /**
   * Generate HTML for a single command form
   * @param {Object} commandManifest - The command manifest
   * @param {Object} state - Initial state
   * @returns {string} HTML for the command form
   */
  generateCommandForm(commandManifest, state, templateDir) {
    // Generate parameter fields HTML
    let parameterFieldsHtml = '';
    
    for (const param of commandManifest.parameters || []) {
      parameterFieldsHtml += this.generateParameterField(param, state);
    }
    
    // Generate examples HTML if examples exist
    let examplesHtml = '';
    if (commandManifest.examples && commandManifest.examples.length > 0) {
      let examplesList = '';
      for (const example of commandManifest.examples) {
        examplesList += `<li><pre><code>${this.escapeHtml(example)}</code></pre></li>`;
      }
      
      // Read and process the examples template
      const examplesTemplatePath = path.join(templateDir, 'command-examples.html');
      let examplesTemplate = fs.readFileSync(examplesTemplatePath, 'utf8');
      examplesTemplate = examplesTemplate.replace('{{EXAMPLE_LIST}}', examplesList);
      
      examplesHtml = examplesTemplate;
    }
    
    // Read and process the form template
    const formTemplatePath = path.join(templateDir, 'command-form.html');
    let formTemplate = fs.readFileSync(formTemplatePath, 'utf8');
    
    // Replace all placeholders in the template using global regex to replace ALL occurrences
    formTemplate = formTemplate
      .replace(/{{COMMAND_NAME}}/g, this.escapeHtml(commandManifest.name))
      .replace(/{{COMMAND_DESCRIPTION}}/g, this.escapeHtml(commandManifest.description || ''))
      .replace('{{PARAMETER_FIELDS}}', parameterFieldsHtml)
      .replace(/{{FORM_SUBMIT_BUTTON}}/g, this.escapeHtml(this.constants.DEFAULTS.FORM_SUBMIT_BUTTON))
      .replace('{{COMMAND_EXAMPLES}}', examplesHtml);
    
    return formTemplate;
  }

  /**
   * Generate HTML for a single parameter field
   * @param {Object} param - Parameter manifest
   * @param {Object} state - Current state
   * @returns {string} HTML for the parameter field
   */
  generateParameterField(param, state) {
    // Determine which builder to use based on parameter type
    let builder;
    
    // Handle enum parameters
    if (param.enum) {
      builder = EnumBuilder;
    }
    // Handle union types
    else if (param.type && param.type.includes('|')) {
      builder = UnionBuilder;
    }
    // Handle regular types
    else if (this.builders[param.type]) {
      builder = this.builders[param.type];
    }
    // Default to string builder
    else {
      builder = StringBuilder;
    }
    
    // Generate the field HTML
    return builder.generate(param, state);
  }

  /**
   * Generate separate HTML, CSS and JS files for the UI
   * @param {Object} globalManifest - Global manifest
   * @param {Array} commandManifests - Array of command manifests
   * @param {Array} commandForms - Array of generated command forms
   * @param {string|null} cssContent - Optional CSS content
   * @param {string} outputDir - Directory to output files
   * @param {string} templateDir - Directory containing templates
   */
  async generateSeparateFiles(globalManifest, commandManifests, commandForms, cssContent, outputDir, templateDir) {
    // Generate client-side JavaScript
    const clientSideJS = this.generateClientSideJavaScript(globalManifest, commandManifests);
    
    // Write the JavaScript file
    const jsFilePath = path.join(outputDir, 'app.js');
    fs.writeFileSync(jsFilePath, clientSideJS);
    
    // Write the CSS file
    let cssContentToWrite = cssContent || '';
    const cssFilePath = path.join(outputDir, 'app.css');
    fs.writeFileSync(cssFilePath, cssContentToWrite);
    
    // Read the base template
    const baseTemplatePath = path.join(templateDir, 'spa-base.html');
    let baseTemplate = fs.readFileSync(baseTemplatePath, 'utf8');
    
    // Replace top-level placeholders
    baseTemplate = baseTemplate
      .replace('{{HTML_TITLE}}', this.escapeHtml(globalManifest.name || this.constants.DEFAULTS.HTML_TITLE))
      .replace('{{PAGE_HEADER}}', this.escapeHtml(globalManifest.description || this.constants.DEFAULTS.PAGE_HEADER))
      .replace('{{COMMAND_SELECTOR_LABEL}}', this.escapeHtml(this.constants.DEFAULTS.COMMAND_SELECTOR_LABEL));
    
    // Replace CSS placeholder with link to CSS file
    baseTemplate = baseTemplate.replace('{{CSS_PLACEHOLDER}}', '<link rel="stylesheet" href="app.css">');
    
    // Replace the entire script block with a reference to the external JS file
    baseTemplate = baseTemplate.replace(
      /<script>\s*\/\/ Embedded JavaScript for the UI\s*{{CLIENT_SIDE_JS}}\s*<\/script>/,
      '<script src="app.js"></script>'
    );
    
    // Generate command options for the selector
    let commandOptions = '';
    for (const cmd of commandManifests) {
      commandOptions += `<option value="${this.escapeHtml(cmd.name)}">${this.escapeHtml(cmd.name)}</option>\n`;
    }
    
    // Replace the command selector options
    baseTemplate = baseTemplate.replace(
      /<option value="">Select a command\.\.\.<\/option>[\s\S]*?<!-- Command options will be populated by JavaScript -->/,
      `<option value="">Select a command...</option>\n${commandOptions}`
    );
    
    // Combine all command forms into the forms container
    const allForms = commandForms.join('\n');
    baseTemplate = baseTemplate.replace(
      '<!-- Individual command forms will be populated by JavaScript -->',
      allForms
    );
    
    return baseTemplate;
  }

  /**
   * Generate client-side JavaScript for the UI
   * @param {Object} globalManifest - Global manifest
   * @param {Array} commandManifests - Array of command manifests
   * @returns {string} Client-side JavaScript code
   */
  generateClientSideJavaScript(globalManifest, commandManifests) {
    // Initialize state from global defaults
    const initialStateJson = JSON.stringify(globalManifest.stateDefaults || {}, null, 2);
    
    // Convert command manifests to JavaScript object format
    const commandsJson = JSON.stringify(commandManifests, null, 2);
    
    // Return the client-side JavaScript code
    return `
      // Client-side JavaScript for the UI
      (function() {
        'use strict';
        
        // Initialize state
        let state = ${initialStateJson};
        
        // Available commands
        const commands = ${commandsJson};
        
        // Map of command manifests by name for quick lookup
        const commandManifests = {};
        commands.forEach(cmd => {
          commandManifests[cmd.name] = cmd;
        });
        
        // DOM elements
        const commandSelector = document.getElementById('commandSelector');
        const formsContainer = document.getElementById('formsContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsContent = document.getElementById('resultsContent');
        
        // Show a specific form and hide others
        function showForm(commandName) {
          // Hide all forms
          document.querySelectorAll('.form-container').forEach(form => {
            form.classList.remove('active-form');
          });
          
          // Show the selected form if it exists
          if (commandName) {
            const form = document.getElementById(commandName + '-form');
            if (form) {
              form.classList.add('active-form');
            }
          }
        }
        
        // Handle command selection change
        commandSelector.addEventListener('change', function(e) {
          const commandName = e.target.value;
          showForm(commandName);
          
          // Scroll to the form
          if (commandName) {
            const form = document.getElementById(commandName + '-form');
            if (form) {
              form.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });
        
        // Handle form submissions
        document.addEventListener('submit', function(e) {
          if (e.target.classList.contains('command-form')) {
            e.preventDefault();
            handleCommandSubmit(e.target);
          }
        });
        
        // Process a command form submission
        async function handleCommandSubmit(form) {
          const commandName = form.getAttribute('data-command');
          if (!commandName) return;
          
          const cmdManifest = commandManifests[commandName];
          if (!cmdManifest) {
            showResults({ error: 'Command not found: ' + commandName }, 'error');
            return;
          }
          
          // Extract form data
          const args = {};
          
          // Map form fields to command arguments
          // Use form-scoped selection instead of global document.getElementById to avoid ID conflicts
          for (const param of cmdManifest.parameters || []) {
            // Find the field within the current form using the data attribute that's already in the HTML
            const field = form.querySelector('[data-param-name="' + param.name + '"]');
            let value;
            
            if (field) {
              // Extract value from the form field
              if (field.type === 'checkbox') {
                value = field.checked;
              } else if (field.type === 'number') {
                value = field.value ? Number(field.value) : (param.required ? 0 : undefined);
              } else if (field.type === 'select-multiple') {
                // Handle multi-select
                const selectedOptions = Array.from(field.selectedOptions);
                value = selectedOptions.map(option => option.value);
              } else {
                value = field.value !== undefined ? field.value : (field.textContent || field.innerText);
                
                // Handle array inputs (comma-separated values)
                if (param.type === 'array' && value) {
                  value = value.split(',').map(v => v.trim()).filter(v => v);
                }
              }
            }
            
            // Apply runtime fallback only if the field value is empty/undefined and a fallback exists
            if ((value === undefined || value === '' || value === null) && param.runtimeFallback && state[param.runtimeFallback] !== undefined) {
              value = state[param.runtimeFallback];
            }
            
            // For checkboxes, we should always include the value (true/false), otherwise only add to args if value exists and is not empty
            if (field && field.type === 'checkbox') {
              args[param.name] = value || false;
            } else if (value !== undefined && value !== '' && value !== null) {
              args[param.name] = value;
            }
          }
          
          // Prepare command object
          const command = {
            name: commandName,
            args: args
          };
          
          // Validate command
          const validationResult = validateCommand(command, cmdManifest);
          if (!validationResult.isValid) {
            showResults({ error: 'Validation Error: ' + validationResult.errors.join(', ') }, 'error');
            return;
          }
          
          console.log('Executing command:', command);
          
          try {
            // Execute the command
            const result = await executeCommand(command);
            
            // Update state based on side effects
            state = updateState(state, command, result, cmdManifest);
            
            // Show results
            showResults(result, result.error ? 'error' : 'success');
          } catch (error) {
            showResults({ error: 'Execution Error: ' + error.message }, 'error');
          }
        }
        
        // Validate a command
        function validateCommand(command, cmdManifest) {
          const paramManifests = cmdManifest.parameters || [];
          return {
            isValid: true,  // Simplified, would use actual validation in a real implementation
            errors: []
          };
        }
        
        // Update state based on command side effects
        function updateState(state, command, result, cmdManifest) {
          // This is a simplified version - in a real implementation, 
          // you would use the StateHelpers.updateState method
          return Object.assign({}, state);
        }
        
        // Escape HTML special characters to prevent XSS - needed for the function below
        function escapeHtml(str) {
          if (typeof str !== 'string') return String(str);
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
        
        // Show results in the results container
        function showResults(result, type = 'success') {
          resultsContainer.classList.remove('hidden', 'error', 'success');
          
          // Determine the appropriate type and content to display
          if (result.error) {
            resultsContainer.classList.add('error');
            resultsContent.innerHTML = '<strong>Error:</strong><br><code>' + escapeHtml(result.error) + '</code>';
          } else if (result.output) {
            resultsContainer.classList.add('success');
            // Format output, handling newlines properly - use string literal for newline
            let formattedOutput = escapeHtml(result.output).replace(new RegExp('\\n', 'g'), '<br>');
            resultsContent.innerHTML = '<strong>Output:</strong><br><code>' + formattedOutput + '</code>';
          } else {
            // If no specific error or output, show the full result for debugging
            resultsContainer.classList.add(type);
            resultsContent.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
          }
        }
        
        // API execution function that makes HTTP requests or uses Electron IPC
        async function executeCommand(command) {
          // Check if we're in Electron environment
          if (window.electronAPI) {
            // Use IPC to send command to main process
            return await window.electronAPI.executeCommand(command);
          } else {
            // Make HTTP API call to the /api endpoint
            console.log('Sending command to API:', command);
            
            try {
              // First, try POST request with JSON body
              const response = await fetch('/api', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  json: JSON.stringify(command) // Server expects the command inside a json property
                })
              });
              
              if (!response.ok) {
                // If response is not OK, try to parse error message
                let errorText = 'HTTP Error: ' + response.status;
                try {
                  const errorData = await response.json();
                  if (errorData.error) {
                    errorText = errorData.error;
                  }
                } catch (e) {
                  // If we can't parse the error as JSON, use status text
                  errorText = response.statusText || errorText;
                }
                throw new Error(errorText);
              }
              
              const result = await response.json();
              return result;
            } catch (postError) {
              // If POST fails, try GET request as fallback
              console.warn('POST request failed, trying GET request as fallback:', postError);
              
              try {
                const urlParams = new URLSearchParams({
                  json: JSON.stringify(command)
                });
                
                const response = await fetch('/api?' + urlParams.toString());
                
                if (!response.ok) {
                  let errorText = 'HTTP Error: ' + response.status;
                  try {
                    const errorData = await response.json();
                    if (errorData.error) {
                      errorText = errorData.error;
                    }
                  } catch (e) {
                    errorText = response.statusText || errorText;
                  }
                  throw new Error(errorText);
                }
                
                const result = await response.json();
                return result;
              } catch (getError) {
                console.error('Both POST and GET API calls failed:', getError);
                throw getError;
              }
            }
          }
        }
        
        // Initialize - hide all forms initially
        showForm('');
        
        console.log('UI initialized with', commands.length, 'commands');
      })();
    `;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}