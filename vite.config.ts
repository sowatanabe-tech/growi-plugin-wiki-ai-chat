import { defineConfig } from 'vite';

// React は使わず素の DOM でウィジェットを注入するため、最小構成。
export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      input: ['/client-entry.tsx'],
    },
  },
});
