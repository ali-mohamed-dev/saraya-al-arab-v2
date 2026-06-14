const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const openShift = await prisma.shift.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
  console.log('Open shift:', openShift ? 'ID: ' + openShift.id + ', status: ' + openShift.status : 'NONE');
  if (openShift) {
    const total = await prisma.order.count({ where: { shiftId: openShift.id } });
    console.log('Total orders in shift:', total);
    console.log('PENDING:', await prisma.order.count({ where: { status: 'PENDING', shiftId: openShift.id } }));
    console.log('CONFIRMED:', await prisma.order.count({ where: { status: 'CONFIRMED', shiftId: openShift.id } }));
    console.log('PREPARING:', await prisma.order.count({ where: { status: 'PREPARING', shiftId: openShift.id } }));
    console.log('READY:', await prisma.order.count({ where: { status: 'READY', shiftId: openShift.id } }));
    console.log('READY_TO_PAY:', await prisma.order.count({ where: { status: 'READY_TO_PAY', shiftId: openShift.id } }));
    console.log('DELIVERED:', await prisma.order.count({ where: { status: 'DELIVERED', shiftId: openShift.id } }));
    console.log('CANCELLED:', await prisma.order.count({ where: { status: 'CANCELLED', shiftId: openShift.id } }));
    const all = await prisma.order.findMany({ where: { shiftId: openShift.id }, orderBy: { createdAt: 'desc' }, take: 10, select: { orderNumber: true, status: true, type: true, customerName: true, tableNumber: true } });
    console.log('\nRecent orders in shift:');
    all.forEach(function(o) { console.log('  #' + o.orderNumber + ': ' + o.status + ' ' + o.type + ' - ' + o.customerName + ' Table: ' + o.tableNumber); });
  }
  await prisma.$disconnect();
}
main().catch(function(e) { console.error('Error:', e.message); process.exit(1); });
