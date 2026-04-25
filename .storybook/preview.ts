import type { Preview } from '@storybook-vue/nuxt'
import UApp from '@nuxt/ui/runtime/components/App.vue'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f8fafc' },
        { name: 'elevated', value: '#ffffff' },
        { name: 'dark', value: '#020617' }
      ]
    }
  },
  decorators: [
    () => ({
      components: { UApp },
      template: '<UApp><div class="min-h-screen bg-default p-6 text-default"><story /></div></UApp>'
    })
  ]
}

export default preview
