import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import { buildWelcomeEmail, type WelcomeEmail } from '../shared/welcome-email'

// These stories call the builder the server sends from, so the message here is the message that
// reaches the inbox.

const APP = { appName: 'Launch Kit', appUrl: 'https://app.example.com' }

/** The subject and first line sit above the body, as an inbox list shows them. */
function inbox(email: WelcomeEmail) {
  return {
    setup() {
      const frame = ref<HTMLIFrameElement | null>(null)
      const preview = email.text.split('\n\n').slice(0, 2).join(' ')

      function fitToContent() {
        const document = frame.value?.contentDocument

        if (frame.value && document) {
          frame.value.style.height = `${document.documentElement.scrollHeight}px`
        }
      }

      return { email, frame, preview, fitToContent }
    },
    template: `
      <div class="mx-auto max-w-[608px] p-6">
        <div class="rounded-t-xl border border-b-0 border-default bg-default px-5 py-4">
          <p class="text-[11px] font-semibold tracking-wider text-dimmed uppercase">Inbox</p>
          <p class="mt-1 text-sm font-semibold text-highlighted">{{ email.subject }}</p>
          <p class="truncate text-sm text-muted">{{ preview }}</p>
        </div>
        <iframe
          ref="frame"
          :srcdoc="email.html"
          title="Email preview"
          class="block w-full rounded-b-xl border border-default bg-white"
          style="height: 420px"
          @load="fitToContent"
        />
      </div>
    `
  }
}

const meta = {
  title: 'Emails/Welcome',
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Welcome',
  render: () => inbox(buildWelcomeEmail({ ...APP, firstName: 'Alice' }))
}

export const NoFirstName: Story = {
  name: 'Signed up without a name',
  render: () => inbox(buildWelcomeEmail({ ...APP, firstName: null }))
}
