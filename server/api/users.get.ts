import { prisma } from '../../app/lib/prisma'

export default defineEventHandler(async () => {
  const users = await prisma.user.findMany({
    include: {
      posts: true
    },
    orderBy: {
      id: 'asc'
    }
  })

  return users
})
