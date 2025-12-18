<template>
  <div>
    <h1 class="mb-6 text-3xl font-bold">
      Dashboard
    </h1>

    <div
      v-if="isPending"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="h-8 w-8 animate-spin"
      />
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <p class="text-red-800">
        Error loading users: {{ error.message }}
      </p>
    </div>

    <div
      v-else-if="data"
      class="space-y-6"
    >
      <div
        v-for="user in data"
        :key="user.id"
        class="rounded-lg border p-6 shadow-sm"
      >
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">
              {{ user.name }}
            </h2>
            <p class="text-gray-600">
              {{ user.email }}
            </p>
          </div>
          <UBadge color="blue">
            {{ user.posts.length }} posts
          </UBadge>
        </div>

        <div
          v-if="user.posts.length > 0"
          class="mt-4 space-y-3"
        >
          <div
            v-for="post in user.posts"
            :key="post.id"
            class="rounded-lg bg-gray-50 p-4"
          >
            <div class="mb-2 flex items-center justify-between">
              <h3 class="font-medium">
                {{ post.title }}
              </h3>
              <UBadge :color="post.published ? 'green' : 'gray'">
                {{ post.published ? 'Published' : 'Draft' }}
              </UBadge>
            </div>
            <p
              v-if="post.content"
              class="text-sm text-gray-600"
            >
              {{ post.content }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="mt-4 text-sm text-gray-500"
        >
          No posts yet
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'app'
})

const { data, isPending, error } = await useFetch('/api/users')
</script>
