import type { StorybookConfig } from '@storybook-vue/nuxt'

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook-vue/nuxt',
    options: {}
  }
}

export default config
