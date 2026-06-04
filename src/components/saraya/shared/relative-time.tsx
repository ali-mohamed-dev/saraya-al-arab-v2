'use client'

import { useState, useEffect } from 'react'

interface RelativeTimeProps {
  dateStr: string
  className?: string
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))

  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

export function RelativeTime({ dateStr, className }: RelativeTimeProps) {
  const [text, setText] = useState(() => getRelativeTime(dateStr))

  useEffect(() => {
    const update = () => setText(getRelativeTime(dateStr))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [dateStr])

  return <span className={className}>{text}</span>
}
