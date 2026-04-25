import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UAlert from '@nuxt/ui/runtime/components/Alert.vue'
import UAvatar from '@nuxt/ui/runtime/components/Avatar.vue'
import UBadge from '@nuxt/ui/runtime/components/Badge.vue'
import UButton from '@nuxt/ui/runtime/components/Button.vue'
import UCard from '@nuxt/ui/runtime/components/Card.vue'
import UProgress from '@nuxt/ui/runtime/components/Progress.vue'

const meta = {
  title: 'Nuxt UI/Card',
  tags: ['autodocs'],
  args: {
    title: 'Launch readiness',
    status: 'On track',
    progress: 72
  },
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 }
    }
  }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ProjectStatus: Story = {
  render: args => ({
    components: { UAlert, UAvatar, UBadge, UButton, UCard, UProgress },
    setup() {
      return { args }
    },
    template: `
      <UCard class="w-[420px]">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-muted">Workspace</p>
              <h3 class="mt-1 text-lg font-semibold text-highlighted">{{ args.title }}</h3>
            </div>
            <UBadge color="success" variant="soft" icon="i-hugeicons-checkmark-circle-02">
              {{ args.status }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-5">
          <UAlert
            color="primary"
            icon="i-hugeicons-sparkles"
            title="Nuxt UI is available in Storybook"
            description="This story renders UCard, UBadge, UAlert, UProgress, UAvatar, and UButton through the Nuxt Storybook runtime."
            variant="soft"
          />

          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">Checklist progress</span>
              <span class="font-medium text-highlighted">{{ args.progress }}%</span>
            </div>
            <UProgress :model-value="args.progress" color="primary" status />
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <UAvatar icon="i-hugeicons-user" size="sm" />
              <div>
                <p class="text-sm font-medium text-highlighted">Product team</p>
                <p class="text-xs text-muted">Updated just now</p>
              </div>
            </div>
            <UButton label="Review" color="primary" trailing-icon="i-hugeicons-arrow-right-02" variant="soft" />
          </div>
        </template>
      </UCard>
    `
  })
}

export const AlertStates: Story = {
  render: () => ({
    components: { UAlert },
    template: `
      <div class="grid w-[520px] gap-4">
        <UAlert color="success" icon="i-hugeicons-checkmark-circle-02" title="Ready to ship" description="All required launch checks are complete." />
        <UAlert color="warning" icon="i-hugeicons-alert-02" title="Needs review" description="Invite copy still needs stakeholder approval." variant="soft" />
        <UAlert color="error" icon="i-hugeicons-alert-circle" title="Blocked" description="Payment provider keys are missing in this environment." variant="subtle" />
      </div>
    `
  })
}
