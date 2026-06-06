'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string
  sortOrder: number
  isActive: boolean
}

interface MenuCategoriesProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function MenuCategories({ activeCategory, onCategoryChange }: MenuCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data: Category[] = await res.json()
          setCategories(data.filter((c) => c.isActive))
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // scroll active button into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  const allCategories = [
    { id: 'all',   name: 'الكل',  icon: '' },
    { id: 'عروض', name: 'عروض', icon: '🔥' },
    ...categories.map(c => ({ id: c.name, name: c.name, icon: c.icon })),
  ]

  return (
    <div className="mb-8 relative" dir="rtl">
      {/* fade edges */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-background to-transparent z-10" />

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading && (
          <div className="flex items-center px-4 py-2 text-muted-foreground/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        )}

        {!loading && allCategories.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(cat.id)}
              className={`
                relative flex-none flex items-center gap-1.5 rounded-full px-4 py-2
                text-sm font-medium whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-[#D4AF37] text-[#0F1419] shadow-[0_2px_12px_rgba(212,175,55,0.35)]'
                  : 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70 hover:text-foreground hover:border-[#D4AF37]/30'
                }
              `}
            >
              {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
              <span>{cat.name}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D4AF37]/60" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}