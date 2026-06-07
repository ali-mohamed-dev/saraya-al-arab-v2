'use client'

import { useAdminAuth } from '@/lib/saraya/hooks'
import {
  UtensilsCrossed, Plus, Megaphone, ClipboardList,
  DollarSign, Users, Armchair, Tag, TrendingDown
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminHeader } from './admin-header'
import { MenuManagementTab } from './menu-management-tab'
import { AddDishTab } from './add-dish-tab'
import { PromotionsTab } from './promotions-tab'
import { OrdersTab } from './orders-tab'
import { ShiftManagement } from './shift-management'
import { StaffManagement } from './staff-management'
import { TableManagement } from './table-management'
import { CategoriesTab } from './categories-tab'
import { AdminExpensesTab } from './admin-expenses-tab'

interface AdminPanelProps {
  onLogout: () => void
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  // Use shared auth hook for admin username (handles sessionStorage internally)
  const { username: adminUsername } = useAdminAuth()

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onLogout={onLogout} />

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Tabs defaultValue="menu" dir="rtl" className="w-full">
          <TabsList className="mb-6 flex w-full gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto [&::-webkit-scrollbar]:hidden justify-start">
            <TabsTrigger value="menu" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة المنيو</span>
              <span className="sm:hidden">المنيو</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">إضافة طبق</span>
              <span className="sm:hidden">إضافة</span>
            </TabsTrigger>
            <TabsTrigger value="promos" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة العروض</span>
              <span className="sm:hidden">العروض</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة الطلبات</span>
              <span className="sm:hidden">الطلبات</span>
            </TabsTrigger>
            <TabsTrigger value="shift" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">الشيفت</span>
              <span className="sm:hidden">الشيفت</span>
            </TabsTrigger>
            <TabsTrigger value="tables" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <Armchair className="h-4 w-4" />
              <span className="hidden sm:inline">الطاولات</span>
              <span className="sm:hidden">الطاولات</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">الموظفين</span>
              <span className="sm:hidden">الموظفين</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">المصروفات</span>
              <span className="sm:hidden">المصروفات</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="shrink-0 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm sm:flex-1">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">التصنيفات</span>
              <span className="sm:hidden">التصنيفات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <MenuManagementTab />
          </TabsContent>

          <TabsContent value="add">
            <AddDishTab />
          </TabsContent>

          <TabsContent value="promos">
            <PromotionsTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab adminUsername={adminUsername} />
          </TabsContent>

          <TabsContent value="shift">
            <ShiftManagement adminUsername={adminUsername} />
          </TabsContent>

          <TabsContent value="tables">
            <TableManagement />
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement />
          </TabsContent>

          <TabsContent value="expenses">
            <AdminExpensesTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
