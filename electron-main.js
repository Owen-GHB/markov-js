import { buildConfig } from './kernel/utils/config-loader.js';

// Create and start the Electron application with unified config
// Using dynamic import to get electron plugin and manifest inside an async IIFE
(async () => {
  const electronPlugin = await import('./kernel/plugins/electron/index.js');
  const { manifest } = await import('./kernel/contract.js');
  
  // Build unified configuration using project root
  const projectRoot = process.cwd(); // Use current working directory as project root
  const config = buildConfig(projectRoot);
  
  await electronPlugin.start(config, manifest);
})();