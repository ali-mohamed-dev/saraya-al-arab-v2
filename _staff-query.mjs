import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const staff = await db.staff.findMany({ select: { id: true, username: true, role: true } })
console.log(JSON.stringify(staff, null, 2))
await db.$disconnect()
