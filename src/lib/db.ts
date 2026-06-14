import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Retry helper for Neon cold start (free tier goes to sleep after inactivity)
export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const isConnectionError = 
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001') ||
        (err as Error)?.message?.includes?.('Can\'t reach database server') ||
        (err as Error)?.message?.includes?.('timed out');

      if (i < retries - 1 && isConnectionError) {
        console.log(`[Database] Connection failed, retrying in ${delay * (i + 1)}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Unreachable')
}

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