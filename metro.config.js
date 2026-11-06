const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Add 'wasm' to asset extensions for expo-sqlite web support
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// 2. Enable package exports for wa-sqlite / expo-sqlite
config.resolver.unstable_enablePackageExports = true;

// 3. Add Cross-Origin Isolation headers required for SharedArrayBuffer on web
config.server = config.server || {};
config.server.enhanceMiddleware = (metroMiddleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return metroMiddleware(req, res, next);
  };
};

module.exports = config;
