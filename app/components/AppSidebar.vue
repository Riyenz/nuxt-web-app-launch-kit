<script setup lang="ts">
import { ref } from 'vue'

type NavItem = {
  label: string
  icon: string
  active?: boolean
  badge?: string
  children?: { label: string }[]
}

const primary = ref<NavItem[]>([
  { label: 'Dashboard', icon: 'i-hugeicons-dashboard-square-01', active: true },
  { label: 'Orders', icon: 'i-hugeicons-package', badge: '46' },
  { label: 'Products', icon: 'i-hugeicons-tag-01' },
  { label: 'Customers', icon: 'i-hugeicons-user-group' },
  { label: 'Content', icon: 'i-hugeicons-image-01' },
  { label: 'Online Store', icon: 'i-hugeicons-store-01' }
])

const secondary = ref<NavItem[]>([
  {
    label: 'Finances',
    icon: 'i-hugeicons-wallet-01',
    children: [
      { label: 'Invoices' },
      { label: 'Transactions' },
      { label: 'Reports' }
    ]
  },
  { label: 'Analytics', icon: 'i-hugeicons-chart-01' },
  { label: 'Discounts', icon: 'i-hugeicons-discount-01' }
])

const footer = ref<NavItem[]>([
  { label: 'Settings', icon: 'i-hugeicons-settings-02' },
  { label: 'Help & Support', icon: 'i-hugeicons-help-circle' }
])

const isFinancesOpen = ref(true)
const isCollapsed = useState('sidebar-collapsed', () => false)

watch(isCollapsed, (value) => {
  if (value) isFinancesOpen.value = false
})
</script>

<template>
  <aside
    class="
      flex h-screen flex-col border-r border-default bg-default py-5
      transition-all duration-200
    "
    :class="isCollapsed ? 'w-20 px-2' : 'w-64 px-4'"
  >
    <div
      class="mb-6 flex items-center"
      :class="isCollapsed ? 'flex-col gap-3' : 'justify-between'"
    >
      <div class="flex items-center gap-2">
        <div
          class="
            flex size-7 items-center justify-center rounded-md bg-primary
            text-inverted
          "
        >
          <UIcon
            name="i-hugeicons-shopping-bag-02"
            class="size-4"
          />
        </div>
        <span
          v-if="!isCollapsed"
          class="text-base font-semibold text-highlighted"
        >Nuxt Boilerplate</span>
      </div>
    </div>

    <nav class="flex flex-1 flex-col gap-1 overflow-y-auto">
      <template
        v-for="item in primary"
        :key="item.label"
      >
        <UTooltip
          :text="item.label"
          :disabled="!isCollapsed"
          :content="{ side: 'right' }"
        >
          <button
            class="
              group flex w-full items-center rounded-lg py-2 text-sm font-medium
              transition-colors
            "
            :class="[
              item.active
                ? 'bg-primary/10 text-primary'
                : `
                  text-muted
                  hover:bg-elevated hover:text-highlighted
                `,
              isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
            ]"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0"
            />
            <span
              v-if="!isCollapsed"
              class="flex-1 text-left"
            >{{ item.label }}</span>
            <UBadge
              v-if="item.badge && !isCollapsed"
              :label="item.badge"
              color="success"
              variant="soft"
              size="sm"
            />
          </button>
        </UTooltip>
      </template>

      <USeparator class="my-3" />

      <template
        v-for="item in secondary"
        :key="item.label"
      >
        <UTooltip
          :text="item.label"
          :disabled="!isCollapsed"
          :content="{ side: 'right' }"
        >
          <button
            class="
              flex w-full items-center rounded-lg py-2 text-sm font-medium
              text-muted transition-colors
              hover:bg-elevated hover:text-highlighted
            "
            :class="isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'"
            @click="item.children && !isCollapsed && (isFinancesOpen = !isFinancesOpen)"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0"
            />
            <span
              v-if="!isCollapsed"
              class="flex-1 text-left"
            >{{ item.label }}</span>
            <UIcon
              v-if="item.children && !isCollapsed"
              :name="isFinancesOpen ? 'i-hugeicons-arrow-up-01' : 'i-hugeicons-arrow-down-01'"
              class="size-4"
            />
          </button>
        </UTooltip>
        <div
          v-if="item.children && isFinancesOpen && !isCollapsed"
          class="ml-6 flex flex-col border-l border-default"
        >
          <button
            v-for="child in item.children"
            :key="child.label"
            class="
              px-4 py-1.5 text-left text-sm text-muted transition-colors
              hover:text-highlighted
            "
          >
            {{ child.label }}
          </button>
        </div>
      </template>
    </nav>

    <div class="mt-4 flex flex-col gap-1">
      <UTooltip
        v-for="item in footer"
        :key="item.label"
        :text="item.label"
        :disabled="!isCollapsed"
        :content="{ side: 'right' }"
      >
        <button
          class="
            flex w-full items-center rounded-lg py-2 text-sm font-medium
            text-muted transition-colors
            hover:bg-elevated hover:text-highlighted
          "
          :class="isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'"
        >
          <UIcon
            :name="item.icon"
            class="size-5 shrink-0"
          />
          <span v-if="!isCollapsed">{{ item.label }}</span>
        </button>
      </UTooltip>
    </div>

    <div
      v-if="!isCollapsed"
      class="
        mt-4 overflow-hidden rounded-lg bg-linear-to-br from-primary-400
        to-primary-700 p-4 text-white
      "
    >
      <div
        class="
          mb-2 flex size-8 items-center justify-center rounded-md bg-white/20
        "
      >
        <UIcon
          name="i-hugeicons-crown"
          class="size-4"
        />
      </div>
      <p class="text-sm font-semibold">
        Upgrade to Premium!
      </p>
      <p class="mt-1 text-xs text-white/80">
        Upgrade your account and unlock all of the benefits.
      </p>
      <UButton
        label="Upgrade premium"
        block
        class="
          mt-3 bg-white/15 text-white
          hover:bg-white/25
        "
      />
    </div>
    <UTooltip
      v-else
      text="Upgrade to Premium"
      :content="{ side: 'right' }"
    >
      <button
        class="
          mt-4 flex w-full items-center justify-center rounded-lg
          bg-linear-to-br from-primary-400 to-primary-700 p-2 text-white
          transition-opacity
          hover:opacity-90
        "
      >
        <UIcon
          name="i-hugeicons-crown"
          class="size-5"
        />
      </button>
    </UTooltip>
  </aside>
</template>
