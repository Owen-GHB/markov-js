import { ElectronApp } from './kernel/transports/electron/ElectronApp.js';
import pathResolver from './kernel/utils/path-resolver.js';

// Create and start the Electron application with default settings
const electronApp = new ElectronApp();
const config = {
  paths: {
    electronPreloadPath: pathResolver.getElectronPreloadPath(),
    servedUIDir: pathResolver.getServedUIDir(),
    generatedUIDir: pathResolver.getGeneratedUIDir(),
    templatesDir: pathResolver.getTemplatesDir(),
    uiFilePath: pathResolver.getUIFilePath(),
    contextFilePath: pathResolver.getContextFilePath('state.json')
  }
};
electronApp.start(config);