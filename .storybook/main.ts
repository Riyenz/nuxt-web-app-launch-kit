import type { StorybookConfig } from '@storybook-vue/nuxt'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const mocksDir = resolve(dirname(fileURLToPath(import.meta.url)), 'mocks')

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook-vue/nuxt',
    options: {}
  },
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {}
    const existingAliases = Array.isArray(viteConfig.resolve.alias)
      ? viteConfig.resolve.alias
      : Object.entries(viteConfig.resolve.alias ?? {}).map(([find, replacement]) => ({ find, replacement }))

    viteConfig.resolve.alias = [
      { find: '@clerk/vue/internal', replacement: resolve(mocksDir, 'clerk-internal.ts') },
      { find: '@clerk/vue', replacement: resolve(mocksDir, 'clerk.ts') },
      ...existingAliases
    ]

    return viteConfig
  }
}

export default config
