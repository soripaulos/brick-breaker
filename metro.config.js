const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [`${__dirname}/node_modules`];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
