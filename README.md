# تعديلات الأمان — saraya-al-arab-v4

## الملفات المتغيرة

| الملف | التعديل |
|---|---|
| `src/app/api/auth/route.ts` | bcrypt.compare بدل plain text comparison |
| `src/app/api/staff/route.ts` | bcrypt.hash عند إنشاء موظف جديد |
| `src/app/api/staff/[id]/route.ts` | bcrypt.hash عند تغيير كلمة المرور + إخفاء الـ password من الـ response |
| `src/app/api/orders/stats/route.ts` | groupBy واحدة بدل 6 queries منفصلة |
| `migrate-passwords.js` | سكريبت لتحويل الكلمات الموجودة في الـ DB |

---

## خطوات التطبيق

### 1. تثبيت bcryptjs

```bash
bun add bcryptjs
bun add -d @types/bcryptjs
```

### 2. نسخ الملفات

انسخ الملفات من هذا المجلد إلى مكانها في المشروع:

```
src/app/api/auth/route.ts         →  استبدل الملف الموجود
src/app/api/staff/route.ts        →  استبدل الملف الموجود
src/app/api/staff/[id]/route.ts   →  استبدل الملف الموجود
src/app/api/orders/stats/route.ts →  استبدل الملف الموجود
migrate-passwords.js              →  حطه في root المشروع
```

### 3. تحويل كلمات المرور الموجودة

> ⚠️ خطوة مهمة — لو عندك موظفين في الـ DB بالفعل

```bash
node migrate-passwords.js
```

السكريبت ده بيمشي على كل الحسابات ويحول اللي لسه plain text، واللي عنده hash بيتجاهله.

### 4. البناء والنشر

```bash
bun run build
bun run start
```

---

## ملاحظة مهمة

بعد ما تحط التعديلات، **أي موظف جديد** هيتخزن كلمة مروره كـ hash تلقائياً.
لو عندك موظفين قدام في الـ DB ومش شغّلت السكريبت، مش هيقدروا يدخلوا.
