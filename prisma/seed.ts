import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

async function main() {
  console.log('🌱 Starting seed...')

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      posts: {
        create: [
          {
            title: 'Getting Started with Nuxt',
            content: 'This is a comprehensive guide to getting started with Nuxt.js framework.',
            published: true
          },
          {
            title: 'Prisma Best Practices',
            content: 'Learn the best practices for using Prisma in your applications.',
            published: false
          }
        ]
      }
    }
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      posts: {
        create: [
          {
            title: 'TypeScript Tips and Tricks',
            content: 'Discover useful TypeScript patterns and tips for better code.',
            published: true
          }
        ]
      }
    }
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      posts: {
        create: []
      }
    }
  })

  console.log('✅ Seed completed!')
  console.log(`   Created/Updated ${3} users`)
  console.log(`   - ${user1.name} (${user1.email})`)
  console.log(`   - ${user2.name} (${user2.email})`)
  console.log(`   - ${user3.name} (${user3.email})`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    if (e.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Please ensure:')
      console.error('   1. PostgreSQL server is running')
      console.error('   2. DATABASE_URL is correctly set in your .env file')
      console.error('   3. The database exists and is accessible')
      console.error('\n   Example DATABASE_URL: postgresql://user:password@localhost:5432/dbname')
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
