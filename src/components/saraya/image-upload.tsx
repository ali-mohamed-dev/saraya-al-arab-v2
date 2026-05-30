'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Loader2, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  aspect?: 'square' | 'wide' | 'banner'
  placeholder?: string
}

export function ImageUpload({
  value,
  onChange,
  label = 'صورة الطبق',
  aspect = 'square',
  placeholder = 'اضغط لرفع صورة أو التقط من الكاميرا',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const aspectClass = {
    square: 'aspect-square',
    wide: 'aspect-video',
    banner: 'aspect-[2.5/1]',
  }[aspect]

  const handleUpload = useCallback(async (file: File) => {
    setError('')

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('نوع الملف غير مدعوم. يُرجى رفع صورة JPEG أو PNG أو WebP')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        onChange(data.imageUrl)
      } else {
        setError(data.error || 'فشل في رفع الصورة')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[#D4AF37]" />
          {label}
        </label>
      )}

      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`relative ${aspectClass} overflow-hidden rounded-xl border border-[#D4AF37]/20 group`}
          >
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              aria-label="حذف الصورة"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Change image button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
            >
              <Camera className="h-3.5 w-3.5" />
              تغيير الصورة
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              ${aspectClass} cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
              flex flex-col items-center justify-center gap-3
              ${dragOver
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 scale-[1.02]'
                : 'border-border/50 bg-muted/20 hover:border-[#D4AF37]/40 hover:bg-muted/40'
              }
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                <p className="text-sm text-muted-foreground">جاري الرفع...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37]/10">
                  <Upload className="h-6 w-6 text-[#D4AF37]" />
                </div>
                <p className="text-sm font-medium text-foreground/80">{placeholder}</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP - حد أقصى 10MB</p>

                {/* Camera button for mobile */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    cameraInputRef.current?.click()
                  }}
                  className="mt-2 gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                >
                  <Camera className="h-4 w-4" />
                  التقط من الكاميرا
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
