'use client'

import { useState, useEffect, useRef } from 'react'
import { Flame, Grid2X2, Loader2 } from 'lucide-react'

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
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories?all=true')
        if (res.ok) {
          const data: Category[] = await res.json()
          setCategories(data)
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  const allCategories = [
    { id: 'الكل', name: 'الكل', icon: '' },
    { id: 'عروض', name: 'العروض', icon: '' },
    ...categories.map((category) => ({ id: category.name, name: category.name, icon: category.icon })),
  ]

  return (
    <div className="relative" dir="rtl">
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent" />

      <div className="flex gap-2 overflow-x-auto px-1 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {loading && (
          <div className="flex h-10 items-center px-4 text-muted-foreground/50">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {!loading && allCategories.map((category) => {
          const isActive = activeCategory === category.id
          return (
            <button
              key={category.id}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(category.id)}
              className={`relative flex h-10 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-[#D4AF37] text-[#0F1419] shadow-[0_2px_12px_rgba(212,175,55,0.35)]'
                  : 'border border-border/40 bg-muted/40 text-muted-foreground hover:border-[#D4AF37]/30 hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              {category.id === 'all' && <Grid2X2 className="h-4 w-4" />}
              {category.id === 'عروض' && <Flame className="h-4 w-4" />}
              {category.icon && <span className="text-base leading-none">{category.icon}</span>}
              <span>{category.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
