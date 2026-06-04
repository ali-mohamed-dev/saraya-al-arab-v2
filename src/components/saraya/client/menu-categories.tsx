'use client'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'الكل', labelEn: 'All' },
  { value: 'عروض', label: 'عروض', labelEn: 'Offers' },
  { value: 'مشويات', label: 'مشويات', labelEn: 'Grills' },
  { value: 'مقبلات', label: 'مقبلات', labelEn: 'Appetizers' },
  { value: 'ساندويتشات', label: 'ساندويتشات', labelEn: 'Sandwiches' },
  { value: 'حلويات', label: 'حلويات', labelEn: 'Desserts' },
  { value: 'مشروبات', label: 'مشروبات', labelEn: 'Beverages' },
  { value: 'أطباق رئيسية', label: 'أطباق رئيسية', labelEn: 'Main Courses' },
]

export { CATEGORY_FILTERS }

interface MenuCategoriesProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function MenuCategories({ activeCategory, onCategoryChange }: MenuCategoriesProps) {
  return (
    <div className="mb-8 flex flex-wrap justify-center gap-2">
      {CATEGORY_FILTERS.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onCategoryChange(cat.value)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            activeCategory === cat.value
              ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]'
              : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30 hover:text-foreground'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
