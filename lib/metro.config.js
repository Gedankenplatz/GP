// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events'),
  process: require.resolve('process/browser'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
};

module.exports = defaultConfig;
