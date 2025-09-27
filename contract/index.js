import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all handler classes
import { TrainHandler } from './train/handler.js';
import { GenerateHandler } from './generate/handler.js';
import { ListModelsHandler } from './listModels/handler.js';
import { ListCorpusHandler } from './listCorpus/handler.js';
import { DeleteHandler } from './delete/handler.js';
import { PGBSearchHandler } from './pgb_search/handler.js';
import { PGBInfoHandler } from './pgb_info/handler.js';
import { PGBDownloadHandler } from './pgb_download/handler.js';
import { HelpHandler } from './help/handler.js';
import { UseHandler } from './use/handler.js';
import { ExitHandler } from './exit/handler.js';

// Import all manifest slices
import trainManifest from './train/manifest.json' with { type: 'json' };
import generateManifest from './generate/manifest.json' with { type: 'json' };
import listModelsManifest from './listModels/manifest.json' with { type: 'json' };
import listCorpusManifest from './listCorpus/manifest.json' with { type: 'json' };
import deleteManifest from './delete/manifest.json' with { type: 'json' };
import useManifest from './use/manifest.json' with { type: 'json' };
import pgbSearchManifest from './pgb_search/manifest.json' with { type: 'json' };
import pgbInfoManifest from './pgb_info/manifest.json' with { type: 'json' };
import pgbDownloadManifest from './pgb_download/manifest.json' with { type: 'json' };
import helpManifest from './help/manifest.json' with { type: 'json' };
import exitManifest from './exit/manifest.json' with { type: 'json' };

// Import global manifest
import globalManifest from './global.json' with { type: 'json' };

// Define the handlers mapping
const handlers = {
  train: new TrainHandler(),
  generate: new GenerateHandler(),
  listModels: new ListModelsHandler(),
  listCorpus: new ListCorpusHandler(),
  delete: new DeleteHandler(),
  use: new UseHandler(),
  pgb_search: new PGBSearchHandler(),
  pgb_info: new PGBInfoHandler(),
  pgb_download: new PGBDownloadHandler(),
  help: new HelpHandler(),
  exit: new ExitHandler(),
};

// Combine all command manifests with global configuration
const manifest = {
  ...globalManifest,
  commands: [
    trainManifest,
    generateManifest,
    listModelsManifest,
    listCorpusManifest,
    deleteManifest,
    useManifest,
    pgbSearchManifest,
    pgbInfoManifest,
    pgbDownloadManifest,
    helpManifest,
    exitManifest,
  ],
};

export { handlers, manifest };