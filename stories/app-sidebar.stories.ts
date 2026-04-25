import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import AppSidebar from '../app/components/AppSidebar.vue'

const meta = {
  title: 'App/Sidebar',
  component: AppSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof AppSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { AppSidebar },
    template: `
      <div class="flex min-h-screen bg-muted">
        <AppSidebar />
      </div>
    `
  })
}
