export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['./test/setup.js'],
  globalTeardown: './test/globalTeardown.js',
  verbose: true,
  silent: false, // Useful to see logger warnings on failures
};
