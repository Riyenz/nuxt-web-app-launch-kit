<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            icon="hugeicons:user-add-01"
            label="New User"
            color="primary"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-8 p-6">
        <div
          class="
            grid grid-cols-2 gap-4
            lg:grid-cols-4
          "
        >
          <UCard
            v-for="stat in stats"
            :key="stat.label"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted">
                  {{ stat.label }}
                </p>
                <p class="mt-1 text-3xl font-bold">
                  {{ stat.value }}
                </p>
              </div>
              <div class="rounded-lg bg-primary/10 p-2">
                <UIcon
                  :name="stat.icon"
                  class="size-5 text-primary"
                />
              </div>
            </div>
          </UCard>
        </div>

        <div>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              Users
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ users.length }} total
            </UBadge>
          </div>

          <div class="space-y-4">
            <div
              v-for="user in users"
              :key="user.id"
              class="rounded-xl border border-default bg-default p-5 shadow-xs"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :alt="user.name"
                    :text="user.name.charAt(0)"
                    size="md"
                  />
                  <div>
                    <p class="font-semibold">
                      {{ user.name }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    :color="user.isActive ? 'success' : 'neutral'"
                    variant="subtle"
                  >
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </UBadge>
                  <UBadge
                    color="info"
                    variant="subtle"
                  >
                    {{ user.posts.length }} posts
                  </UBadge>
                </div>
              </div>

              <div
                v-if="user.posts.length > 0"
                class="mt-4 space-y-2"
              >
                <div
                  v-for="post in user.posts"
                  :key="post.id"
                  class="
                    flex items-center justify-between rounded-lg bg-muted/50
                    px-4 py-2.5
                  "
                >
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="hugeicons:file-02"
                      class="size-4 text-muted"
                    />
                    <p class="text-sm font-medium">
                      {{ post.title }}
                    </p>
                  </div>
                  <UBadge
                    :color="post.isPublished ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ post.isPublished ? 'Published' : 'Draft' }}
                  </UBadge>
                </div>
              </div>

              <p
                v-else
                class="mt-4 text-sm text-muted"
              >
                No posts yet
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'app'
})

const users = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    isActive: true,
    posts: [
      { id: 1, title: 'Getting Started with Nuxt 4', isPublished: true },
      { id: 2, title: 'Vue 3 Composition API Deep Dive', isPublished: true },
      { id: 3, title: 'State Management in 2025', isPublished: false }
    ]
  },
  {
    id: 2,
    name: 'Bob Martinez',
    email: 'bob@example.com',
    isActive: true,
    posts: [
      { id: 4, title: 'Building REST APIs with Nitro', isPublished: true },
      { id: 5, title: 'Prisma ORM Best Practices', isPublished: false }
    ]
  },
  {
    id: 3,
    name: 'Charlie Kim',
    email: 'charlie@example.com',
    isActive: false,
    posts: [
      { id: 6, title: 'Authentication with Clerk', isPublished: true }
    ]
  },
  {
    id: 4,
    name: 'Diana Patel',
    email: 'diana@example.com',
    isActive: true,
    posts: []
  },
  {
    id: 5,
    name: 'Ethan Brooks',
    email: 'ethan@example.com',
    isActive: true,
    posts: [
      { id: 7, title: 'Nuxt UI Components Guide', isPublished: true },
      { id: 8, title: 'Performance Optimization Tips', isPublished: true },
      { id: 9, title: 'Deploying Nuxt on Vercel', isPublished: false }
    ]
  }
]

const stats = computed(() => {
  const totalPosts = users.reduce((sum, u) => sum + u.posts.length, 0)
  const publishedPosts = users.reduce((sum, u) => sum + u.posts.filter(p => p.isPublished).length, 0)

  return [
    { label: 'Total Users', value: users.length, icon: 'hugeicons:user-group' },
    { label: 'Total Posts', value: totalPosts, icon: 'hugeicons:file-02' },
    { label: 'Published', value: publishedPosts, icon: 'hugeicons:tick-double-02' },
    { label: 'Drafts', value: totalPosts - publishedPosts, icon: 'hugeicons:pen-01' }
  ]
})
</script>
