// Unit tests import server utils, which use Nitro's auto-imported globals and build flags.
// `nuxt typecheck` checks those files strictly in the server project; these imports only let the
// test project load them.
import type {} from 'nitropack/types'
import type {} from '../../.nuxt/types/nitro-imports'
import type {} from '../../.nuxt/types/runtime-config'
