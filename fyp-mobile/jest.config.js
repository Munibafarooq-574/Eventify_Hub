const path = require('path');

module.exports = {
  // eslint-disable-next-line no-undef
  rootDir: path.resolve(__dirname),
  preset: 'jest-expo',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|@react-native-community' +
      '|@expo' +
      '|expo' +
      '|expo-asset' +
      '|expo-router' +
      '|expo-constants' +
      '|expo-font' +
      '|expo-secure-store' +
      '|@react-native/js-polyfills' +
      '|react-native-toast-message' +
    ')',
  ],
  moduleNameMapper: {
    '@expo/vector-icons': '<rootDir>/__mocks__/@expo/vector-icons.ts',
  },
};
