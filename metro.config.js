// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.assetExts.push('bin');
config.resolver.assetExts.push('gguf');
config.resolver.sourceExts.push('wasm');
config.resolver.unstable_enablePackageExports = true;

// Alias tslib to prevent Metro from resolving it to an incompatible ESM file
// (tslib/modules/index.js) when package exports are enabled.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js'),
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
