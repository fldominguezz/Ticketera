import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://10.1.9.240',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
  },
});
