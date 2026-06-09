'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ClientMenu } from '@/components/Top/client/client-menu'
import { AdminLogin } from '@/components/Top/admin-login'
import { ErrorBoundary } from '@/components/Top/shared/error-boundary'
import type { Meal, Promotion } from '@/lib/saraya/types'

const AdminPanel = dynamic(() => import('@/components/Top/admin/admin-panel').then(m => ({ default: m.AdminPanel })), { ssr: false })
const WaiterPanel = dynamic(() => import('@/components/Top/waiter/waiter-panel').then(m => ({ default: m.WaiterPanel })), { ssr: false })
const CashierPanel = dynamic(() => import('@/components/Top/cashier/cashier-panel').then(m => ({ default: m.CashierPanel })), { ssr: false })
const KitchenPanel = dynamic(() => import('@/components/Top/kitchen/kitchen-panel').then(m => ({ default: m.KitchenPanel })), { ssr: false })
const BaristaPanel = dynamic(() => import('@/components/Top/barista/barista-panel').then(m => ({ default: m.BaristaPanel })), { ssr: false })

type View = 'menu' | 'staff-login' | 'admin-panel' | 'waiter-panel' | 'cashier-panel' | 'kitchen-panel' | 'barista-panel' | 'loading'

interface ClientPageProps {
  initialMeals: Meal[]
  initialPromotions: Promotion[]
  initialTakingOrders: boolean | null
  initialStoreMessage: string
}

function getViewForRole(role: string): View {
  switch (role) {
    case 'ADMIN': return 'admin-panel'
    case 'WAITER': return 'waiter-panel'
    case 'CASHIER': return 'cashier-panel'
    case 'KITCHEN': return 'kitchen-panel'
    case 'BARISTA': return 'barista-panel'
    default: return 'menu'
  }
}

export function ClientPage({ initialMeals, initialPromotions, initialTakingOrders, initialStoreMessage }: ClientPageProps) {
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

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent" />
      </div>
    )
  }

  switch (view) {
    case 'menu':
      return (
        <ErrorBoundary>
          <ClientMenu
            onAdminClick={handleAdminClick}
            initialMeals={initialMeals}
            initialPromotions={initialPromotions}
            initialTakingOrders={initialTakingOrders}
            initialStoreMessage={initialStoreMessage}
          />
        </ErrorBoundary>
      )
    case 'staff-login':
      return <ErrorBoundary><AdminLogin onLogin={handleLoginSuccess} onBack={() => setView('menu')} /></ErrorBoundary>
    case 'admin-panel':
      return <ErrorBoundary fallbackTitle="حدث خطأ في لوحة الإدارة"><AdminPanel onLogout={handleLogout} /></ErrorBoundary>
    case 'waiter-panel':
      return <ErrorBoundary fallbackTitle="حدث خطأ في لوحة الويتر"><WaiterPanel onLogout={handleLogout} /></ErrorBoundary>
    case 'kitchen-panel':
      return <ErrorBoundary fallbackTitle="حدث خطأ في شاشة المطبخ"><KitchenPanel onLogout={handleLogout} /></ErrorBoundary>
    case 'barista-panel':
      return <ErrorBoundary fallbackTitle="حدث خطأ في شاشة الباريستا"><BaristaPanel onLogout={handleLogout} /></ErrorBoundary>
    case 'cashier-panel':
      return <ErrorBoundary fallbackTitle="حدث خطأ في لوحة الكاشير"><CashierPanel onLogout={handleLogout} /></ErrorBoundary>
    default:
      return (
        <ErrorBoundary>
          <ClientMenu
            onAdminClick={handleAdminClick}
            initialMeals={initialMeals}
            initialPromotions={initialPromotions}
            initialTakingOrders={initialTakingOrders}
            initialStoreMessage={initialStoreMessage}
          />
        </ErrorBoundary>
      )
  }
}
