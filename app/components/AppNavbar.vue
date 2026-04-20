<script setup lang="ts">
import { ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useClerk } from '@clerk/vue'

const search = ref('')

const { user } = useUser()
const clerk = useClerk()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')
const isSidebarCollapsed = useState('sidebar-collapsed', () => false)

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

type Notification = {
  id: number
  title: string
  description: string
  time: string
  icon: string
  isUnread: boolean
}

const notifications = ref<Notification[]>([
  {
    id: 1,
    title: 'New order received',
    description: 'Order #1024 from Jane Cooper',
    time: '2m ago',
    icon: 'i-hugeicons-package',
    isUnread: true
  },
  {
    id: 2,
    title: 'Payment successful',
    description: '$240.00 from Acme Inc.',
    time: '1h ago',
    icon: 'i-hugeicons-credit-card',
    isUnread: true
  },
  {
    id: 3,
    title: 'Weekly report ready',
    description: 'Your analytics report is available',
    time: 'Yesterday',
    icon: 'i-hugeicons-chart-01',
    isUnread: false
  }
])

const unreadCount = computed(() => notifications.value.filter(n => n.isUnread).length)

function markAllRead() {
  notifications.value = notifications.value.map(n => ({ ...n, isUnread: false }))
}

const profileItems = computed<DropdownMenuItem[][]>(() => [
  [
    { label: user.value?.fullName ?? user.value?.primaryEmailAddress?.emailAddress ?? 'Account', type: 'label' }
  ],
  [
    { label: 'Profile', icon: 'i-hugeicons-user' },
    { label: 'Settings', icon: 'i-hugeicons-settings-02' },
    { label: 'Billing', icon: 'i-hugeicons-credit-card' }
  ],
  [
    { label: 'Help & Support', icon: 'i-hugeicons-help-circle' },
    { label: 'Keyboard shortcuts', icon: 'i-hugeicons-keyboard', kbds: ['⌘', 'K'] }
  ],
  [
    {
      label: 'Sign out',
      icon: 'i-hugeicons-logout-03',
      color: 'error',
      onSelect: () => { clerk.value?.signOut() }
    }
  ]
])
</script>

<template>
  <header
    class="
      flex h-16 items-center justify-between gap-4 border-b border-default
      bg-default px-6
    "
  >
    <div class="flex flex-1 items-center gap-3">
      <UButton
        :icon="isSidebarCollapsed ? 'i-hugeicons-sidebar-right' : 'i-hugeicons-sidebar-left'"
        color="neutral"
        variant="ghost"
        size="md"
        square
        @click="toggleSidebar"
      />
      <div class="w-full max-w-sm">
        <UInput
          v-model="search"
          icon="i-hugeicons-search-01"
          placeholder="Search anything..."
          size="md"
          variant="soft"
          color="neutral"
          :ui="{ base: 'rounded-full bg-elevated border-0' }"
          class="w-full"
        >
          <template #trailing>
            <UKbd>⌘</UKbd>
            <UKbd>K</UKbd>
          </template>
        </UInput>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UTooltip
        :text="isDark ? 'Light mode' : 'Dark mode'"
        :content="{ side: 'bottom' }"
      >
        <UButton
          :icon="isDark ? 'i-hugeicons-moon-02' : 'i-hugeicons-sun-03'"
          color="neutral"
          variant="ghost"
          size="md"
          square
          class="rounded-full border border-default"
          @click="toggleTheme"
        />
      </UTooltip>

      <UPopover
        :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
        :ui="{ content: 'rounded-md' }"
      >
        <UChip
          :text="unreadCount"
          :show="unreadCount > 0"
          color="error"
          size="3xl"
          :ui="{ base: 'font-semibold text-[10px] px-1 min-w-4 h-4' }"
        >
          <UButton
            icon="i-hugeicons-notification-03"
            color="neutral"
            variant="ghost"
            size="md"
            square
            class="rounded-full border border-default"
          />
        </UChip>

        <template #content>
          <div class="w-80 p-1.5">
            <div
              class="
                mb-1.5 flex items-center justify-between border-b border-default
                p-2
              "
            >
              <p class="text-sm font-semibold text-highlighted">
                Notifications
              </p>
              <UButton
                v-if="unreadCount > 0"
                label="Mark all read"
                variant="link"
                size="xs"
                :padded="false"
                @click="markAllRead"
              />
            </div>
            <div class="max-h-80 overflow-y-auto">
              <div
                v-for="item in notifications"
                :key="item.id"
                class="
                  flex cursor-pointer gap-3 rounded-md p-2 transition-colors
                  hover:bg-elevated/60
                "
              >
                <div
                  class="
                    flex size-9 shrink-0 items-center justify-center
                    rounded-full bg-primary/10 text-primary
                  "
                >
                  <UIcon
                    :name="item.icon"
                    class="size-4"
                  />
                </div>
                <div class="flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-highlighted">
                      {{ item.title }}
                    </p>
                    <span
                      v-if="item.isUnread"
                      class="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    />
                  </div>
                  <p class="text-xs text-muted">
                    {{ item.description }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ item.time }}
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-1.5 border-t border-default px-2 pt-2">
              <UButton
                label="View all notifications"
                variant="ghost"
                color="neutral"
                size="sm"
                block
              />
            </div>
          </div>
        </template>
      </UPopover>

      <UDropdownMenu
        :items="profileItems"
        :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
        :ui="{
          content: 'w-60 rounded-md p-1.5',
          item: 'py-2 px-2 gap-3',
          label: 'py-2 px-2',
          separator: 'my-1.5'
        }"
      >
        <button
          class="
            rounded-full transition-opacity
            hover:opacity-80
          "
        >
          <UAvatar
            :src="user?.imageUrl"
            :alt="user?.fullName ?? 'User'"
            size="md"
            class="ring-2 ring-default"
          />
        </button>
      </UDropdownMenu>
    </div>
  </header>
</template>
