import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Helper to safely access Prisma models with a clear error if client is stale
export function getModel(modelName: string) {
  const model = (db as any)[modelName]
  if (!model) {
    throw new Error(
      `Prisma model "${modelName}" not found. ` +
      `Run "npx prisma generate" and restart the server. ` +
      `If the model exists in schema.prisma, delete the .next folder and try again.`
    )
  }
  return model
}
