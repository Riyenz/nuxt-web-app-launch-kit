import { computed, defineComponent, h, ref } from 'vue'

export type MockUser = {
  id: string
  fullName: string
  imageUrl?: string
  primaryEmailAddress: { emailAddress: string }
}

const user = ref<MockUser | null>(null)
const isLoaded = ref(true)
const isSignedIn = computed(() => user.value !== null)
const clerk = ref({
  openSignIn: () => undefined,
  openUserProfile: () => undefined,
  signOut: async () => undefined
})

export function setMockUser(nextUser: MockUser | null) {
  user.value = nextUser
}

export function resetMockClerkState() {
  user.value = null
}

export const clerkPlugin = {
  install() {}
}

export const Show = defineComponent({
  name: 'Show',
  props: { when: { type: [String, Object, Function], default: undefined } },
  setup(props, { slots }) {
    return () => {
      const isVisible = props.when === 'signed-out' ? !isSignedIn.value : isSignedIn.value
      return isVisible ? slots.default?.() : slots.fallback?.()
    }
  }
})

export const UserButton = defineComponent({
  name: 'UserButton',
  setup() {
    return () => h('button', {
      'type': 'button',
      'aria-label': 'Account',
      'class': 'flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-inverted'
    }, user.value?.fullName.charAt(0) ?? '?')
  }
})

export function useUser() {
  return { isLoaded, isSignedIn, user }
}

export function useAuth() {
  return {
    isLoaded,
    isSignedIn,
    userId: computed(() => user.value?.id ?? null),
    sessionId: computed(() => (user.value ? 'storybook-session' : null)),
    getToken: async () => null
  }
}

export function useClerk() {
  return clerk
}
