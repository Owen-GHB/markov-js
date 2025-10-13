// utils/PluginLoader.js
import { ResourceLoader } from './ResourceLoader.js';

export class PluginLoader {
    constructor(pluginsBaseDir) {
        this.resourceLoader = new ResourceLoader(pluginsBaseDir);
    }

    async getPlugin(pluginName) {
        try {
            return await this.resourceLoader.getResource(pluginName);
        } catch {
            return null; // Maintain existing API compatibility
        }
    }

    async getPluginMethod(pluginName, methodName) {
        try {
            return await this.resourceLoader.getResourceMethod(pluginName, methodName);
        } catch {
            return null; // Maintain existing API compatibility
        }
    }
}