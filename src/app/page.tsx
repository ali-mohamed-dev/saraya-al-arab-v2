'use client'

import { useState, useEffect, ComponentType } from 'react'
import { ClientMenu } from '@/components/saraya/client-menu'
import { AdminLogin } from '@/components/saraya/admin-login'
import { AdminPanel } from '@/components/saraya/admin-panel'
import { WaiterPanel } from '@/components/saraya/waiter-panel'
import { CashierPanel } from '@/components/saraya/cashier-panel'
import { KitchenPanel } from '@/components/saraya/kitchen-panel'
import { BaristaPanel } from '@/components/saraya/barista-panel'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type View = 'menu' | 'staff-login' | 'admin-panel' | 'waiter-panel' | 'cashier-panel' | 'kitchen-panel' | 'barista-panel'

// Error boundary wrapper to prevent full-page crashes
function withErrorBoundary<P extends object>(Component: ComponentType<P>, fallbackView: string, onViewChange: (view: string) => void) {
  return function ErrorBoundaryWrapper(props: P) {
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
      setHasError(false)
    }, [Component])

    if (hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8" dir="rtl">
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">حدث خطأ غير متوقع</h2>
            <p className="text-muted-foreground">يرجى تحديث الصفحة والمحاولة مرة أخرى</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setHasError(false); onViewChange('menu') }} variant="outline" className="gap-2">
                العودة للقائمة
              </Button>
              <Button onClick={() => setHasError(false)} className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431]">
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      )
    }

    try {
      return <Component {...props} />
    } catch (error) {
      console.error('Component error:', error)
      setHasError(true)
      return null
    }
  }
}

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

function getInitialView(): View {
  const authStatus = sessionStorage.getItem('saraya-admin-auth')
  const savedRole = sessionStorage.getItem('saraya-staff-role')
  if (authStatus === 'true' && savedRole) return getViewForRole(savedRole)
  return 'menu'
}

export default function Home() {
  const [view, setView] = useState<View>('menu')

  useEffect(() => {
    setView(getInitialView())
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

  const handleBackToMenu = () => {
    setView('menu')
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
