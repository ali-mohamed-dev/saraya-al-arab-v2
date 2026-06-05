/**
 * migrate-passwords.js
 * ─────────────────────────────────────────────────────────────────
 * يحول كلمات المرور الـ plain text الموجودة في قاعدة البيانات
 * إلى bcrypt hashes.
 *
 * شغّله مرة واحدة بس قبل ما تنشر التعديلات:
 *   node migrate-passwords.js
 * ─────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const db = new PrismaClient()

async function migratePasswords() {
  console.log('🔐 بدء تحويل كلمات المرور...\n')

  const allStaff = await db.admin.findMany({
    select: { id: true, username: true, password: true },
  })

  let migrated = 0
  let skipped  = 0

  for (const staff of allStaff) {
    // إذا الكلمة تبدأ بـ $2b$ أو $2a$ فهي bcrypt بالفعل — تجاهلها
    if (staff.password.startsWith('$2b$') || staff.password.startsWith('$2a$')) {
      console.log(`  ✓ ${staff.username} — already hashed, skipped`)
      skipped++
      continue
    }

    const hashed = await bcrypt.hash(staff.password, 12)
    await db.admin.update({
      where: { id: staff.id },
      data: { password: hashed },
    })

    console.log(`  ✓ ${staff.username} — migrated`)
    migrated++
  }

  console.log(`\n✅ تم: ${migrated} migrated, ${skipped} already hashed`)
  await db.$disconnect()
}

migratePasswords().catch((err) => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
