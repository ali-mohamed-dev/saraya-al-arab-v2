'use client'

import { useEffect } from 'react'

export function KeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch('/api/ping').catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return null
}
