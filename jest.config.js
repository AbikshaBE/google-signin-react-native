const preset = require('react-native/jest-preset');

module.exports = {
  ...preset,
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  setupFiles: [...preset.setupFiles, '<rootDir>/jest.setupEnv.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|unimodules|@unimodules|sentry-expo|native-base|react-clone-referenced-element|@supabase|immer|@reduxjs|uuid)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

