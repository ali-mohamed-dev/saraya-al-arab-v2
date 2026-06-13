'use client'

import { AdminMonthlyReport } from './admin-expense-manager'

interface AdminExpensesTabProps {
  username: string
}

export function AdminExpensesTab({ username }: AdminExpensesTabProps) {
  return <AdminMonthlyReport username={username} />
}
