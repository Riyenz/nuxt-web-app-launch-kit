import { PrismaClient } from '../../generated/prisma/client'
import { createDbAdapter } from './db-adapter'

const adapter = createDbAdapter()
export const prisma = new PrismaClient({ adapter })
