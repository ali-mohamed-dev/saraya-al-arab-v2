# TODO (BlackboxAI) — شاشة المطبخ/الويتر/الكاشير حسب الدور والجاهزية

- [ ] فهم/تجهيز متطلبات من الكود الحالي (تم مبدئيًا)
- [ ] إضافة حقل جديد في Prisma داخل `order` (مثلاً `kitchenAccess: boolean` و `handoffReadyAt` إن لزم)
- [ ] تجهيز Migration وتحديث Prisma Client
- [ ] تحديث `POST /api/orders` لتهيئة الحقل الافتراضي
- [ ] تحديث `PUT /api/orders/[id]/status` لتعديل الوصول للمطبخ بناءً على: نوع الطلب + دور من يغير الحالة + وجود كلمة Admin
- [ ] تعديل `GET /api/orders` لتدعم فلترة `kitchenAccess` و/أو `shiftId`
- [ ] تعديل `KitchenPanel` ليعرض الطلبات المسموح لها فقط للمطبخ + شرط “جاهز للاستلام”
- [ ] تعديل `WaiterPanel` لتظهر الصالة للمطبخ بعد موافقة الويتر فقط
- [ ] تعديل `CashierPanel` لتؤكد/تسمح للمطبخ فقط بعد تأكيد الكاشير للـ takeaway/delivery
- [ ] تعديل `AdminPanel` في tab المدفوع/إيراد الشيفت ليعتمد على شيفت current فقط (مش إجمالي)
- [ ] اختبار سريع: transitions + ظهور/اختفاء الطلبات على الثلاث شاشات

