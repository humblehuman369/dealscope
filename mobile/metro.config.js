const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Watch the shared package for changes during development
config.watchFolders = [sharedRoot];

// Resolve @dealscope/shared from the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(projectRoot, '..', 'node_modules'),
];

// Ensure .ts files in the shared package are resolved
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

module.exports = config;
