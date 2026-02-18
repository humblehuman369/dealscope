const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Allow Metro to watch and transpile the local @dealscope/shared package
// (linked via "file:../shared" in package.json).
config.watchFolders = [sharedRoot];

module.exports = config;
