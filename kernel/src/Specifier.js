export class Specifier {
  static specifyCommand(commandPath, manifest, target = false, namespace = null) {
    // Handle relative paths when namespace provided
    if (namespace && !commandPath.includes('.')) {
      // Convert "subcommand" to "mylibrary.subcommand" 
      commandPath = `${namespace}.${commandPath}`;
    }

    // 🎯 FLAT LOOKUP (always allowed)
    const flatLookupPath = namespace 
      ? `${namespace}.${commandPath}`  // Namespaced flat
      : commandPath;                   // Root flat
    
    const flatSpec = manifest.commands[flatLookupPath];
    if (flatSpec) {
      return { ...flatSpec, name: flatLookupPath };
    }

    // 🎯 If target=false, FORBID namespaced lookup
    if (!target) {
      throw new Error(`Command not found: ${commandPath}`);
    }

    // 🎯 target=true → TRY NAMESPACED LOOKUP
    if (commandPath.includes('.')) {
      const parts = commandPath.split('.');
      let current = manifest;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current.nodes?.[parts[i]];
        if (!current) {
          throw new Error(`Target command not found: ${commandPath}`);
        }
      }
      
      const commandName = parts[parts.length - 1];
      const targetSpec = current.commands?.[commandName];
      if (targetSpec) {
        return { ...targetSpec, name: commandPath };
      }
    }

    throw new Error(`Command not found: ${commandPath}`);
  }
}