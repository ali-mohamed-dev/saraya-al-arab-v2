const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check ALL shifts
  const shifts = await prisma.shift.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('Recent shifts:');
  shifts.forEach(s => {
    console.log(`  ${s.id}: status=${s.status}, startedAt=${s.startedAt}, endedAt=${s.endedAt}`);
  });
  
  // Check if May orders have null shiftId
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-06-01T00:00:00Z');
  
  const nullShift = await prisma.order.count({ where: { createdAt: { gte: start, lt: end }, shiftId: null } });
  const withShift = await prisma.order.count({ where: { createdAt: { gte: start, lt: end }, shiftId: { not: null } } });
  console.log(`\nMay orders: nullShift=${nullShift}, withShift=${withShift}`);
  
  // Check unique shiftIds in May orders
  const mayOrders = await prisma.order.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { shiftId: true }, distinct: ['shiftId'] });
  const activeShiftIds = mayOrders.map(o => o.shiftId).filter(Boolean);
  console.log('Unique shiftIds in May orders:', activeShiftIds);
  
  if (activeShiftIds.length > 0) {
    const theseShifts = await prisma.shift.findMany({ where: { id: { in: activeShiftIds } } });
    theseShifts.forEach(s => {
      console.log(`  Shift ${s.id}: status=${s.status}, startedAt=${s.startedAt}, endedAt=${s.endedAt}`);
    });
  }
  
  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
