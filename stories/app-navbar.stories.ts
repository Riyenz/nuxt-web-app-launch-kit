import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import AppNavbar from '../app/components/AppNavbar.vue'

const meta = {
  title: 'App/Navbar',
  component: AppNavbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof AppNavbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { AppNavbar },
    template: `
      <div class="min-h-screen bg-muted">
        <AppNavbar />
      </div>
    `
  })
}
