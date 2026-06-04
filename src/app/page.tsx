'use client'

import { useState, useEffect } from 'react'
import { ClientMenu } from '@/components/saraya/client/client-menu'
import { AdminLogin } from '@/components/saraya/admin-login'
import { AdminPanel } from '@/components/saraya/admin/admin-panel'
import { WaiterPanel } from '@/components/saraya/waiter/waiter-panel'
import { CashierPanel } from '@/components/saraya/cashier/cashier-panel'
import { KitchenPanel } from '@/components/saraya/kitchen/kitchen-panel'
import { BaristaPanel } from '@/components/saraya/barista/barista-panel'

type View = 'menu' | 'staff-login' | 'admin-panel' | 'waiter-panel' | 'cashier-panel' | 'kitchen-panel' | 'barista-panel' | 'loading'

function getViewForRole(role: string): View {
  switch (role) {
    case 'ADMIN': return 'admin-panel'
    case 'WAITER': return 'waiter-panel'
    case 'CASHIER': return 'cashier-panel'
    case 'KITCHEN': return 'kitchen-panel'
    case 'BARISTA': return 'barista-panel'
    default: return 'admin-panel'
  }
}

export default function Home() {
  // Always start with 'loading' to avoid hydration mismatch.
  // Server renders nothing visible, client then reads sessionStorage in useEffect
  // and sets the correct view — same HTML on both sides.
  const [view, setView] = useState<View>('loading')

  useEffect(() => {
    const authStatus = sessionStorage.getItem('saraya-admin-auth')
    const savedRole = sessionStorage.getItem('saraya-staff-role')
    if (authStatus === 'true' && savedRole) {
      setView(getViewForRole(savedRole))
    } else {
      setView('menu')
    }
  }, [])

  const handleAdminClick = () => {
    const authStatus = sessionStorage.getItem('saraya-admin-auth')
    const savedRole = sessionStorage.getItem('saraya-staff-role')
    if (authStatus === 'true' && savedRole) {
      setView(getViewForRole(savedRole))
    } else {
      setView('staff-login')
    }
  }

  const handleLoginSuccess = (role: string, username: string) => {
    sessionStorage.setItem('saraya-admin-auth', 'true')
    sessionStorage.setItem('saraya-staff-role', role)
    sessionStorage.setItem('saraya-staff-username', username)
    setView(getViewForRole(role))
  }

  const handleLogout = () => {
    sessionStorage.removeItem('saraya-admin-auth')
    sessionStorage.removeItem('saraya-staff-role')
    sessionStorage.removeItem('saraya-staff-username')
    setView('menu')
  }

  // While checking auth state, show nothing (prevents hydration mismatch)
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent" />
      </div>
    )
  }

  switch (view) {
    case 'menu':
      return <ClientMenu onAdminClick={handleAdminClick} />
    case 'staff-login':
      return <AdminLogin onLogin={handleLoginSuccess} />
    case 'admin-panel':
      return <AdminPanel onLogout={handleLogout} />
    case 'waiter-panel':
      return <WaiterPanel onLogout={handleLogout} />
    case 'cashier-panel':
      return <CashierPanel onLogout={handleLogout} />
    case 'kitchen-panel':
      return <KitchenPanel onLogout={handleLogout} />
    case 'barista-panel':
      return <BaristaPanel onLogout={handleLogout} />
    default:
      return <ClientMenu onAdminClick={handleAdminClick} />
  }
}
