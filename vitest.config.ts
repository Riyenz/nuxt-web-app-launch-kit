import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')

// Plain node-environment unit tests for pure logic (no Nuxt runtime, no DB).
// `~~`/`@@` map to the project root and `~`/`@` to the Nuxt srcDir (`app/`) so both
// server modules and pure app composables import cleanly.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts']
  },
  resolve: {
    alias: {
      '~~': rootDir,
      '@@': rootDir,
      '~': `${rootDir}/app`,
      '@': `${rootDir}/app`
    }
  }
})
