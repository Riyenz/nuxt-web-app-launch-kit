<template>
  <div>
    <div class="space-y-8 p-6">
      <div
        class="
          flex flex-col gap-4
          lg:flex-row lg:items-center lg:justify-between
        "
      >
        <h1 class="text-3xl font-semibold text-highlighted">
          Dashboard
        </h1>
        <div
          class="
            flex w-full flex-col gap-3
            sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end
          "
        >
          <div
            class="
              flex h-11 w-full min-w-0 overflow-hidden rounded-full border
              border-default bg-default shadow-xs
              sm:w-auto
            "
          >
            <button
              type="button"
              class="
                flex min-w-0 flex-1 items-center gap-2 px-4 text-sm font-medium
                text-default transition-colors
                hover:bg-elevated/60
                sm:flex-none
              "
            >
              <UIcon
                name="i-hugeicons-calendar-03"
                class="size-4 shrink-0 text-muted"
              />
              <span class="truncate whitespace-nowrap">
                Jan 1, 2025 - Feb 1, 2025
              </span>
            </button>
            <div class="my-2 w-px shrink-0 bg-default" />
            <button
              type="button"
              class="
                flex shrink-0 items-center gap-2 px-4 text-sm font-medium
                text-default transition-colors
                hover:bg-elevated/60
              "
            >
              <span class="whitespace-nowrap">Last 30 days</span>
              <UIcon
                name="i-hugeicons-arrow-down-01"
                class="size-4 text-muted"
              />
            </button>
          </div>
          <UButton
            icon="i-hugeicons-download-04"
            label="Export"
            color="primary"
            class="
              h-11 justify-center rounded-full px-5 shadow-md shadow-primary/20
            "
          />
        </div>
      </div>

      <div
        class="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="
            rounded-lg border border-default bg-default p-5 shadow-xs
            transition-shadow
            hover:shadow-sm
          "
        >
          <div class="flex items-start justify-between">
            <p class="text-sm text-muted">
              {{ stat.label }}
            </p>
            <div
              class="
                flex size-8 items-center justify-center rounded-full bg-elevated
              "
            >
              <UIcon
                :name="stat.icon"
                class="size-4 text-primary"
              />
            </div>
          </div>
          <div class="mt-4 flex items-end justify-between gap-2">
            <p class="text-3xl font-bold tracking-tight text-highlighted">
              {{ stat.value }}
            </p>
            <div
              class="flex items-center gap-1 text-xs font-semibold"
              :class="stat.isUp ? 'text-success' : 'text-error'"
            >
              <UIcon
                :name="stat.isUp ? 'i-hugeicons-arrow-up-right-01' : 'i-hugeicons-arrow-down-right-01'"
                class="size-3.5"
              />
              {{ stat.delta }}
            </div>
          </div>
          <p class="mt-1 text-xs text-muted">
            vs {{ stat.previous }} last period
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'app'
})

const stats = [
  { label: 'Page Views', value: '16,431', delta: '+15.3%', isUp: true, previous: '14,253', icon: 'i-hugeicons-view' },
  { label: 'Visitors', value: '6,225', delta: '+6.4%', isUp: true, previous: '5,732', icon: 'i-hugeicons-user-group' },
  { label: 'Click', value: '2,832', delta: '-15.3%', isUp: false, previous: '3,294', icon: 'i-hugeicons-cursor-01' },
  { label: 'Orders', value: '1,224', delta: '+6.4%', isUp: true, previous: '1,106', icon: 'i-hugeicons-package' }
]
</script>
