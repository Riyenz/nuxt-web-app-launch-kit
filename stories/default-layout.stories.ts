import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import DefaultLayout from '../app/layouts/default.vue'
import { resetMockClerkState, setMockUser } from '../.storybook/mocks/clerk'

const meta = {
  title: 'App/Default layout',
  component: DefaultLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  },
  beforeEach() {
    return resetMockClerkState
  },
  render: () => ({
    components: { DefaultLayout },
    template: `
      <DefaultLayout>
        <p class="p-6 text-muted">Page content</p>
      </DefaultLayout>
    `
  })
} satisfies Meta<typeof DefaultLayout>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {}

export const SignedIn: Story = {
  beforeEach() {
    setMockUser({
      id: 'user_storybook',
      fullName: 'Ada Lovelace',
      primaryEmailAddress: { emailAddress: 'ada@example.com' }
    })
    return resetMockClerkState
  }
}
