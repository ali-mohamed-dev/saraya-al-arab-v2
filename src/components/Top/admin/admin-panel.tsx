'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/lib/saraya/hooks'
import {
  UtensilsCrossed, ClipboardList,
  DollarSign, Users, Armchair, FileSpreadsheet, Globe, Settings, Clock,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { AdminHeader } from './admin-header'
import { MenuManagementTab } from './menu-management/menu-management-tab'
import { OrdersTab } from './orders-tab/orders-tab'
import { ShiftManagement } from './shift-management/shift-management'
import { StaffManagement } from './staff-management/staff-management'
import { TableManagement } from './table-management/table-management'
import { AdminExpensesTab } from './reports/admin-expenses-tab'
import { EmployeesTab } from './employees-tab/employees-tab'
import { AttendanceRegister } from './attendance-register/attendance-register'
import { UsersTab } from './users-tab/users-tab'
import { SettingsTab } from './settings/settings-tab'
import { ClosingTimeAlert } from './components/closing-time-alert'

const TABS = [
  { value: 'menu',     label: 'المنيو',    shortLabel: 'المنيو',      icon: UtensilsCrossed },
  { value: 'orders',   label: 'الطلبات',    shortLabel: 'الطلبات',    icon: ClipboardList },
  { value: 'shift',    label: 'الشيفت',     shortLabel: 'الشيفت',     icon: DollarSign },
  { value: 'tables',   label: 'الطاولات',   shortLabel: 'الطاولات',   icon: Armchair },
  { value: 'employees',label: 'العمال',     shortLabel: 'العمال',     icon: Users },
  { value: 'users',    label: 'المستخدمين', shortLabel: 'المستخدمين', icon: Globe },
  { value: 'staff',    label: 'الموظفين',   shortLabel: 'الموظفين',   icon: Users },
  { value: 'attendance', label: 'الحضور',    shortLabel: 'حضور',       icon: Clock },
  { value: 'expenses', label: 'التقارير',   shortLabel: 'تقارير',     icon: FileSpreadsheet },
  { value: 'settings', label: 'الإعدادات',  shortLabel: 'إعدادات',    icon: Settings },
] as const

interface AdminPanelProps {
  onLogout: () => void
}

function AdminPanelInner({ onLogout, adminUsername }: AdminPanelProps & { adminUsername: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'menu'
  const [drawerOpen, setDrawerOpen] = useState(false)

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleDrawerTabClick = (tab: string) => {
    setTab(tab)
    setDrawerOpen(false)
  }

  // Find the active tab's label for the header
  const activeTabData = TABS.find(t => t.value === activeTab)
  const activeTabLabel = activeTabData?.label || 'لوحة التحكم'

  return (
    <>
      <AdminHeader
        onLogout={onLogout}
        activeTabLabel={activeTabLabel}
        onDrawerToggle={() => setDrawerOpen(true)}
      />
      <ClosingTimeAlert />

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Desktop: full horizontal tab bar (sticky below header) */}
        <div className="hidden md:block sticky top-14 z-20 -mx-6 px-6 pb-3 bg-background/95 backdrop-blur-md border-b border-border/30 mb-6">
          <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setTab(tab.value)}
                  className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm transition-all font-medium
                    ${isActive
                      ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border/50'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-black' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile: no tab bar, navigation is via hamburger menu in header */}

        {/* Mobile Drawer / Sheet */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="p-4 pb-2 border-b border-border/30">
              <SheetTitle className="text-right text-base">جميع الأقسام</SheetTitle>
              <SheetDescription className="text-right text-xs text-muted-foreground">اختر القسم للانتقال إليه</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3 overflow-y-auto max-h-[calc(100dvh-8rem)]">
              {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => handleDrawerTabClick(tab.value)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm transition-all font-medium text-right
                      ${isActive
                        ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                        : 'bg-transparent text-foreground hover:bg-muted'
                      }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-black' : 'text-muted-foreground'}`} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Tab Content */}
        {activeTab === 'menu' && <MenuManagementTab />}
        {activeTab === 'orders' && <OrdersTab adminUsername={adminUsername} />}
        {activeTab === 'shift' && <ShiftManagement adminUsername={adminUsername} />}
        {activeTab === 'tables' && <TableManagement />}
        {activeTab === 'employees' && <EmployeesTab username={adminUsername} />}
        {activeTab === 'attendance' && <AttendanceRegister username={adminUsername} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'staff' && <StaffManagement />}
        {activeTab === 'expenses' && <AdminExpensesTab username={adminUsername} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </>
  )
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const { username: adminUsername } = useAdminAuth()

  return (
    <div className="min-h-dvh bg-background">
      <Suspense fallback={<div className="mx-auto max-w-7xl p-4 md:p-6"><div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div></div>}>
        <AdminPanelInner onLogout={onLogout} adminUsername={adminUsername} />
      </Suspense>
    </div>
  )
}
