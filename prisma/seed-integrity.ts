import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

// The rows prisma/seed.ts is supposed to leave behind. The e2e job runs this
// after seeding a fresh database, so a drifted fixture fails here.
const SEED_USERS = [
  {
    email: 'alice@example.com',
    name: 'Alice Johnson',
    posts: [
      { title: 'Getting Started with Nuxt', published: true },
      { title: 'Prisma Best Practices', published: false }
    ]
  },
  {
    email: 'bob@example.com',
    name: 'Bob Smith',
    posts: [
      { title: 'TypeScript Tips and Tricks', published: true }
    ]
  },
  {
    email: 'charlie@example.com',
    name: 'Charlie Brown',
    posts: []
  }
]

function postKey(post: { title: string, published: boolean }) {
  return `${post.title}:${post.published}`
}

async function main() {
  const users = await prisma.user.findMany({ include: { posts: true } })
  const failures: string[] = []

  if (users.length !== SEED_USERS.length) {
    failures.push(`expected ${SEED_USERS.length} users, found ${users.length}`)
  }

  for (const expected of SEED_USERS) {
    const user = users.find(candidate => candidate.email === expected.email)

    if (!user) {
      failures.push(`missing ${expected.email}`)
      continue
    }

    if (user.name !== expected.name) {
      failures.push(`${expected.email}: name is ${user.name ?? 'null'}, expected ${expected.name}`)
    }

    const actualPosts = user.posts.map(postKey).sort()
    const expectedPosts = expected.posts.map(postKey).sort()

    if (actualPosts.join('|') !== expectedPosts.join('|')) {
      failures.push(`${expected.email}: posts are [${actualPosts.join(', ')}], expected [${expectedPosts.join(', ')}]`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Seed integrity failed:\n${failures.join('\n')}`)
  }

  console.log(`Seed integrity passed: ${users.length} users.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
