import { AppInterface } from './Handler.js';

export class JSONAPI {
    constructor() {
        this.app = new AppInterface();
    }

    async handleInput(input) {
        try {
            let command = JSON.parse(input);
            return await this.app.handleCommand(command);            
        } catch (error) {
            return { error: error.message, output: null };
        }
    }
}