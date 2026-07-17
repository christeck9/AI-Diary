/**
 * withLlamaBuildFromSource.js
 *
 * Expo Config Plugin: Forces llama.rn to build llama.cpp from source
 * instead of using the prebuilt rnllama.xcframework binary.
 *
 * WHY THIS IS NEEDED:
 * The prebuilt xcframework is compiled on llama.rn maintainers' CI with specific
 * Xcode flags. When EAS compiles our app with a potentially different Xcode version
 * or Hermes ABI, the prebuilt binary can trigger JSI property getter recursion,
 * causing "Maximum call stack size exceeded (native stack depth)" on iOS production builds.
 *
 * Setting RNLLAMA_BUILD_FROM_SOURCE=1 compiles llama.cpp locally on the Apple server
 * during EAS build, ensuring binary compatibility with our exact Hermes/Xcode configuration.
 *
 * Reference: https://github.com/mybigday/llama.rn#build-from-source
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withLlamaBuildFromSource(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withLlamaBuildFromSource] Podfile not found at:', podfilePath);
        return config;
      }

      let content = fs.readFileSync(podfilePath, 'utf-8');

      const injectionMarker = "# INJECTED BY CONFIG PLUGIN: withLlamaBuildFromSource";

      if (content.includes(injectionMarker)) {
        console.log('[withLlamaBuildFromSource] RNLLAMA_BUILD_FROM_SOURCE already injected, skipping.');
        return config;
      }

      // Inject at the very top of the Podfile, before any other content,
      // so the ENV variable is set before the llama.rn pod is evaluated.
      const injection = `${injectionMarker}
# Force llama.rn to compile llama.cpp from source for ABI compatibility with
# this project's Hermes version. Prevents "native stack depth exceeded" JSI crashes
# caused by prebuilt xcframework binary incompatibility on production iOS builds.
ENV['RNLLAMA_BUILD_FROM_SOURCE'] = '1'

`;

      content = injection + content;
      fs.writeFileSync(podfilePath, content, 'utf-8');

      console.log('[withLlamaBuildFromSource] Successfully injected RNLLAMA_BUILD_FROM_SOURCE=1 into Podfile.');
      return config;
    },
  ]);
}

module.exports = withLlamaBuildFromSource;
