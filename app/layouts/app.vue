<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <UButton
          v-if="!collapsed"
          icon="hugeicons:building-03"
          to="/app/dashboard"
          label="My Project"
          variant="ghost"
          color="neutral"
          size="xl"
        />
        <UIcon
          v-else
          class="size-6"
          name="hugeicons:building-03"
        />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          :label="collapsed ? undefined : 'Search...'"
          icon="hugeicons:search-02"
          color="neutral"
          variant="outline"
          block
          :square="collapsed"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[1]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'start', side: 'top' }"
        >
          <UButton
            :label="user?.fullName ?? ''"
            :avatar="{
              src: user?.imageUrl ?? '',
              alt: user?.fullName ?? ''
            }"
            color="neutral"
            variant="ghost"
            class="w-full"
            :block="collapsed"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch
      :groups="searchGroups"
      :fuse="{
        fuseOptions: {
          keys: ['label', 'suffix']
        }
      }"
    />

    <slot />
  </UDashboardGroup>
</template>

<script lang="ts" setup>
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { useClerk } from '@clerk/vue'
import { computed } from 'vue'
import { definePageMeta, navigateTo, useUser } from '#imports'

const items: NavigationMenuItem[][] = [[{
  label: 'Dashboard',
  icon: 'hugeicons:dashboard-browsing',
  active: true
}], [{
  label: 'Feedback',
  icon: 'hugeicons:message-02',
  to: 'https://github.com/nuxt-ui-tinemplates/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'hugeicons:customer-support',
  to: 'https://github.com/nuxt/ui',
  target: '_blank'
}]]

const { user } = useUser()
const clerk = useClerk()

const userMenuItems: DropdownMenuItem[][] = [[{
  label: 'Logout',
  icon: 'hugeicons:logout-02',
  onSelect: () => {
    clerk.value?.signOut()
  }
}]]

const searchGroups = computed(() => [
  {
    id: 'navigation',
    label: 'Navigation',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'hugeicons:dashboard-browsing',
        to: '/app/dashboard',
        onSelect: () => {
          navigateTo('/app/dashboard')
        }
      },
      {
        id: 'home',
        label: 'Home',
        icon: 'hugeicons:home-01',
        to: '/',
        onSelect: () => {
          navigateTo('/')
        }
      }
    ]
  },
  {
    id: 'actions',
    label: 'Actions',
    items: [
      {
        id: 'logout',
        label: 'Logout',
        icon: 'hugeicons:logout-02',
        kbds: ['shift', 'L'],
        onSelect: () => {
          clerk.value?.signOut()
        }
      }
    ]
  }
])

definePageMeta({
  middleware: ['auth']
})
</script>
