'use client'

import { useState } from 'react'
import { TableInfoType } from './types'
import { CheckCircle2, XCircle, Loader2, Hash, KeyRound } from 'lucide-react'

interface TableInfoFormProps {
  tableInfo: TableInfoType
  onUpdate: (info: Partial<TableInfoType>) => void
}

export function TableInfoForm({ tableInfo, onUpdate }: TableInfoFormProps) {
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const verifyTableCode = async () => {
    if (!tableInfo.tableNumber.trim() || !tableInfo.tableCode.trim()) {
      setError('يرجى إدخال رقم الطاولة والكود')
      return
    }

    setVerifying(true)
    setError('')

    try {
      const res = await fetch('/api/tables/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableInfo.tableNumber,
          code: tableInfo.tableCode,
        }),
      })
      const data = await res.json()

      if (res.ok && data.valid) {
        onUpdate({ isValid: true })
        setError('')
      } else {
        onUpdate({ isValid: false })
        setError(data.message || 'كود الطاولة غير صحيح')
      }
    } catch {
      setError('حدث خطأ في التحقق، حاول مرة أخرى')
      onUpdate({ isValid: false })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base">معلومات الطاولة</h3>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="h-4 w-4" />
            رقم الطاولة
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={tableInfo.tableNumber}
            onChange={(e) => {
              onUpdate({ tableNumber: e.target.value, isValid: false })
              setError('')
            }}
            placeholder="أدخل رقم الطاولة"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" />
            كود الطاولة السري
          </label>
          <input
            type="text"
            value={tableInfo.tableCode}
            onChange={(e) => {
              onUpdate({ tableCode: e.target.value, isValid: false })
              setError('')
            }}
            placeholder="أدخل الكود الموجود على الطاولة"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            dir="ltr"
          />
        </div>

        <button
          onClick={verifyTableCode}
          disabled={verifying || !tableInfo.tableNumber.trim() || !tableInfo.tableCode.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التحقق...
            </>
          ) : tableInfo.isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              تم التحقق بنجاح
            </>
          ) : (
            'تحقق من الكود'
          )}
        </button>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {tableInfo.isValid && !error && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            تم التحقق من الطاولة بنجاح
          </div>
        )}
      </div>
    </div>
  )
}