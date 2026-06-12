const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  new RegExp(`${path.resolve(__dirname, 'dist-web').replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`),
]);

module.exports = config;