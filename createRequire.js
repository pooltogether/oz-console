const originalrequire = require("original-require")
const path = require('path')

module.exports = function createRequire(searchPathStart) {
  return function (pkgPath) {
      // code from https://github.com/trufflesuite/truffle/blob/develop/packages/require/require.js

      // Ugh. Simulate a full require function for the file.
      pkgPath = pkgPath.trim();

      // If absolute, just require.
      if (path.isAbsolute(pkgPath)) return originalrequire(pkgPath);

      // If relative, it's relative to the file.
      if (pkgPath[0] === ".") {
        return originalrequire(path.resolve(searchPathStart, pkgPath));
      } else {
        // Not absolute, not relative, must be a globally or locally installed module.
        // Try local first.
        // Here we have to require from the node_modules directory directly.

        var moduleDir = searchPathStart;
        while (true) {
          try {
            return originalrequire(
              path.join(moduleDir, "node_modules", pkgPath)
            );
          } catch (e) {}
          var oldModuleDir = moduleDir;
          moduleDir = path.resolve(moduleDir, "..");
          if (moduleDir === oldModuleDir) break;
        }

        // Try global, and let the error throw.
        return originalrequire(pkgPath);
      }
  }
}