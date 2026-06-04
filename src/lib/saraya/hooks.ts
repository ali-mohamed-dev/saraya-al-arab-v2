'use client'

import { useState, useEffect, useRef } from 'react'
import { getRelativeTime } from './helpers'

// ── useAdminAuth ─────────────────────────────────────────────────────────

// Always return default state to avoid SSR/client hydration mismatch.
// Auth state is read in useEffect after mount.
const DEFAULT_AUTH = { isAuthenticated: false, role: null as string | null, username: 'admin' }

export function useAdminAuth() {
  const [authState, setAuthState] = useState(DEFAULT_AUTH)

  // Read sessionStorage AFTER mount to avoid hydration mismatch
  useEffect(() => {
    const authStatus = sessionStorage.getItem('saraya-admin-auth')
    const savedRole = sessionStorage.getItem('saraya-staff-role')
    const savedUsername = sessionStorage.getItem('saraya-staff-username')
    if (authStatus === 'true') {
      setAuthState({ isAuthenticated: true, role: savedRole, username: savedUsername || 'admin' })
    }
  }, [])

  const login = (newRole: string, newUsername: string) => {
    sessionStorage.setItem('saraya-admin-auth', 'true')
    sessionStorage.setItem('saraya-staff-role', newRole)
    sessionStorage.setItem('saraya-staff-username', newUsername)
    setAuthState({ isAuthenticated: true, role: newRole, username: newUsername })
  }

  const logout = () => {
    sessionStorage.removeItem('saraya-admin-auth')
    sessionStorage.removeItem('saraya-staff-role')
    sessionStorage.removeItem('saraya-staff-username')
    setAuthState({ isAuthenticated: false, role: null, username: 'admin' })
  }

  return { username: authState.username, role: authState.role, isAuthenticated: authState.isAuthenticated, login, logout }
}

// ── useOrderPolling ──────────────────────────────────────────────────────

interface UseOrderPollingOptions {
  interval?: number
  enabled?: boolean
}

export function useOrderPolling(
  fetchFn: () => Promise<void>,
  options: UseOrderPollingOptions = {}
) {
  const { interval = 5000, enabled = true } = options
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const poll = async () => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      try {
        await fetchFn()
      } finally {
        isFetchingRef.current = false
      }
    }

    const id = setInterval(poll, interval)
    return () => clearInterval(id)
  }, [fetchFn, interval, enabled])

  return { isFetchingRef }
}

// ── useRelativeTimers ────────────────────────────────────────────────────

export function useRelativeTimers(orders: { id: string; createdAt: string }[]) {
  const [timers, setTimers] = useState<Record<string, string>>({})

  useEffect(() => {
    const updateTimers = () => {
      const newTimers: Record<string, string> = {}
      orders.forEach((o) => {
        newTimers[o.id] = getRelativeTime(o.createdAt)
      })
      setTimers(newTimers)
    }
    updateTimers()
    const id = setInterval(updateTimers, 30000)
    return () => clearInterval(id)
  }, [orders])

  return timers
}
