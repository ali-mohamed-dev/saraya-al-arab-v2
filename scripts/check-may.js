const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-06-01T00:00:00Z');
  
  const [orders, orderItems, expenses, shifts, attendance] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.orderItem.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.expense.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.shift.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.attendance.count({ where: { date: { gte: start, lt: end } } }),
  ]);
  
  console.log('May 2026 data:');
  console.log('  Orders:', orders);
  console.log('  OrderItems:', orderItems);
  console.log('  Expenses:', expenses);
  console.log('  Shifts:', shifts);
  console.log('  Attendance:', attendance);
  
  const currentShift = await prisma.shift.findFirst({ where: { status: 'OPEN' } });
  console.log('  Current open shift:', currentShift?.id || 'none');
  if (currentShift) {
    console.log('  Started at:', currentShift.startedAt);
    console.log('  In May?', currentShift.startedAt >= start && currentShift.startedAt < end ? 'YES' : 'NO');
  }
  
  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
