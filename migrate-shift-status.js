#!/usr/bin/env node
/**
 * One-time migration: update all shifts with status='active' to status='OPEN'
 * and all with status='closed' to status='CLOSED'
 * 
 * Run with: node migrate-shift-status.js
 */
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function migrate() {
  console.log('Migrating shift statuses...')
  
  const toOpen = await db.shift.updateMany({
    where: { status: 'active' },
    data: { status: 'OPEN' },
  })
  console.log(`Updated ${toOpen.count} shifts: active → OPEN`)

  const toClosed = await db.shift.updateMany({
    where: { status: 'closed' },
    data: { status: 'CLOSED' },
  })
  console.log(`Updated ${toClosed.count} shifts: closed → CLOSED`)

  console.log('Done!')
  await db.$disconnect()
}

migrate().catch(console.error)
