export const CATEGORIES = [
  { value: 'مشويات', label: 'مشويات / Grills' },
  { value: 'مقبلات', label: 'مقبلات / Appetizers' },
  { value: 'ساندويتشات', label: 'ساندويتشات / Sandwiches' },
  { value: 'حلويات', label: 'حلويات / Desserts' },
  { value: 'مشروبات', label: 'مشروبات / Beverages' },
  { value: 'أطباق رئيسية', label: 'أطباق رئيسية / Main Courses' },
]

export const PREP_AREAS = [
  { value: 'KITCHEN', label: 'المطبخ', color: 'text-orange-400' },
  { value: 'BARISTA', label: 'الباريستا', color: 'text-blue-400' },
  { value: 'HALL', label: 'الصالة (مباشر)', color: 'text-green-400' },
]

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'جديد', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  PREPARING: { label: 'قيد التحضير', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  READY: { label: 'جاهز', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  READY_TO_PAY: { label: 'جاهز للدفع', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  DELIVERED: { label: 'تم التسليم', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELLED: { label: 'ملغي', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
}

export const ORDER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  DINE_IN: { label: 'صالة', color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', color: 'text-purple-400' },
}

export const ROLE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  ADMIN: { label: 'مدير', color: 'text-[#D4AF37]', icon: 'Shield' },
  WAITER: { label: 'ويتر', color: 'text-blue-400', icon: 'UtensilsCrossed' },
  CASHIER: { label: 'كاشير', color: 'text-green-400', icon: 'DollarSign' },
  KITCHEN: { label: 'مطبخ', color: 'text-orange-400', icon: 'Flame' },
  BARISTA: { label: 'باريستا', color: 'text-purple-400', icon: 'Coffee' },
}

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'PENDING', label: 'جديد' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'PREPARING', label: 'قيد التحضير' },
  { value: 'READY', label: 'جاهز' },
  { value: 'READY_TO_PAY', label: 'جاهز للدفع' },
  { value: 'DELIVERED', label: 'تم التسليم' },
  { value: 'CANCELLED', label: 'ملغي' },
]

export const TYPE_FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'DINE_IN', label: 'صالة' },
  { value: 'TAKEAWAY', label: 'تيكاوي' },
  { value: 'DELIVERY', label: 'ديليفري' },
]

export const EXPENSE_CATEGORIES = [
  { value: 'مواد خام', label: 'مواد خام / Raw Materials' },
  { value: 'رواتب', label: 'رواتب / Salaries' },
  { value: 'إيجار', label: 'إيجار / Rent' },
  { value: 'صيانة', label: 'صيانة / Maintenance' },
  { value: 'كهرباء ومياه', label: 'كهرباء ومياه / Utilities' },
  { value: 'أخرى', label: 'أخرى / Other' },
]

export const SERVICE_CHARGE_RATE = 0.12
export const REFRESH_INTERVAL = 5000
