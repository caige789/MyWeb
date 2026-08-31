import { PrismaClient } from '@prisma/client/wasm'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (connectionString) {
    // Cloudflare Workers / serverless 环境：使用 Neon driver adapter 直连 PostgreSQL
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
