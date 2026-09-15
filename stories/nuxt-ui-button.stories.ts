import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UButton from '@nuxt/ui/runtime/components/Button.vue'

const meta = {
  title: 'Nuxt UI/Button',
  tags: ['autodocs'],
  args: {
    label: 'Create launch plan',
    color: 'primary',
    variant: 'solid',
    size: 'md',
    icon: 'hugeicons:rocket-01',
    trailingIcon: 'hugeicons:arrow-right-02',
    block: false,
    loading: false,
    disabled: false
  },
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']
    },
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'soft', 'subtle', 'ghost', 'link']
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl']
    }
  }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: args => ({
    components: { UButton },
    setup() {
      return { args }
    },
    template: `
      <div class="w-80 rounded-lg border border-default bg-elevated p-6">
        <UButton v-bind="args" />
      </div>
    `
  })
}

export const Variants: Story = {
  render: () => ({
    components: { UButton },
    template: `
      <div class="grid w-[520px] gap-5 rounded-lg border border-default bg-elevated p-6">
        <div class="flex flex-wrap gap-3">
          <UButton label="Solid" color="primary" variant="solid" icon="hugeicons:rocket-01" />
          <UButton label="Soft" color="secondary" variant="soft" icon="hugeicons:sparkles" />
          <UButton label="Outline" color="neutral" variant="outline" icon="hugeicons:dashboard-square-01" />
          <UButton label="Subtle" color="success" variant="subtle" icon="hugeicons:checkmark-circle-02" />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UButton aria-label="Add item" color="primary" icon="hugeicons:plus-sign" square />
          <UButton aria-label="View calendar" color="info" icon="hugeicons:calendar-03" variant="soft" square />
          <UButton label="Loading" color="primary" icon="hugeicons:rocket-01" loading />
          <UButton label="Disabled" color="neutral" disabled variant="outline" />
        </div>
      </div>
    `
  })
}
