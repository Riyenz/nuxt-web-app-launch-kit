// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import tailwindcss from 'eslint-plugin-better-tailwindcss'
import storybook from 'eslint-plugin-storybook'

export default withNuxt([
  {
    plugins: {
      'better-tailwindcss': tailwindcss
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css'
      }
    },
    rules: {
      ...tailwindcss.configs.recommended.rules
    }
  },
  ...storybook.configs['flat/recommended']
])
