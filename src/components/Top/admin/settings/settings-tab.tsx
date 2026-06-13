'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DoorOpen, DoorClosed, Clock, Gift, Loader2, Settings as SettingsIcon, Save,
  Timer, Bell, AlertTriangle, Coins, Zap, Check, X, RefreshCw, Sun, Moon
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

function SkeletonCard({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-5 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted/60" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-3 w-48 rounded bg-muted/40" />
        </div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-muted/30" />
      ))}
    </div>
  )
}

export function SettingsTab() {
  const { toast } = useToast()

  const [takingOrders, setTakingOrders] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)

  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [closeWarningMinutes, setCloseWarningMinutes] = useState(10)
  const [autoCloseMinutes, setAutoCloseMinutes] = useState(10)
  const [savingWork, setSavingWork] = useState(false)

  const [cashbackEnabled, setCashbackEnabled] = useState(false)
  const [cashbackThreshold, setCashbackThreshold] = useState(1000)
  const [cashbackAmount, setCashbackAmount] = useState(50)
  const [cashbackLoading, setCashbackLoading] = useState(true)
  const [savingCashback, setSavingCashback] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/settings/loyalty').then(r => r.ok ? r.json() : null),
    ]).then(([settings, loyalty]) => {
      if (settings) {
        setTakingOrders(settings.takingOrders)
        setOpenTime(settings.openTime || '09:00')
        setCloseTime(settings.closeTime || '23:00')
        setCloseWarningMinutes(settings.closeWarningMinutes ?? 10)
        setAutoCloseMinutes(settings.autoCloseMinutes ?? 10)
      }
      if (loyalty) {
        setCashbackEnabled(loyalty.loyaltyEnabled || false)
        setCashbackThreshold(loyalty.loyaltyThreshold || 1000)
        setCashbackAmount(loyalty.loyaltyCashback || 50)
      }
    }).catch(() => {
      toast({ title: 'خطأ', description: 'فشل تحميل الإعدادات', variant: 'destructive' })
    }).finally(() => {
      setLoading(false)
      setCashbackLoading(false)
    })
  }, [])

  const handleToggleOrders = async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takingOrders: !takingOrders }),
      })
      if (res.ok) {
        const data = await res.json()
        setTakingOrders(data.takingOrders)
        toast({ title: data.takingOrders ? '✅ المطعم مفتوح' : '🔴 المطعم مغلق', description: data.takingOrders ? 'يمكن للعملاء تقديم الطلبات' : 'الطلبات موقوفة مؤقتاً' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحديث حالة المطعم', variant: 'destructive' })
    } finally { setToggling(false) }
  }

  const saveWorkSettings = async () => {
    setSavingWork(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openTime, closeTime, closeWarningMinutes, autoCloseMinutes }),
      })
      if (res.ok) {
        toast({ title: '✅ تم الحفظ', description: 'تم تحديث مواعيد العمل' })
      } else {
        toast({ title: 'خطأ', description: 'فشل حفظ المواعيد', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setSavingWork(false) }
  }

  const saveCashback = async () => {
    setSavingCashback(true)
    try {
      const res = await fetch('/api/settings/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loyaltyEnabled: cashbackEnabled, loyaltyThreshold: Number(cashbackThreshold), loyaltyCashback: Number(cashbackAmount) }),
      })
      if (res.ok) {
        toast({ title: '✅ تم الحفظ', description: 'تم تحديث إعدادات نقاط الولاء' })
      } else {
        toast({ title: 'خطأ', description: 'فشل حفظ الإعدادات', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setSavingCashback(false) }
  }

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإعدادات</h1>
            <div className="h-3 w-28 mt-1 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        <SkeletonCard rows={1} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={3} />
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ═══════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإعدادات</h1>
            <p className="text-[11px] text-muted-foreground">التحكم في إعدادات المطعم ونظام الولاء</p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          RESTAURANT STATUS
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 }}>
        <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                takingOrders ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {takingOrders
                  ? <DoorOpen className="h-4 w-4 text-emerald-400" />
                  : <DoorClosed className="h-4 w-4 text-red-400" />
                }
              </div>
              <div>
                <p className="font-bold text-sm">حالة المطعم</p>
                <p className="text-[11px] text-muted-foreground">التحكم في استقبال الطلبات</p>
              </div>
              <Badge variant="outline" className={`mr-auto h-6 text-xs border ${
                takingOrders
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                  : 'border-red-500/30 text-red-400 bg-red-500/5'
              }`}>
                {takingOrders ? '🟢 مفتوح' : '🔴 مغلق'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/10 border border-border/20">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  takingOrders
                    ? 'bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
                    : 'bg-red-500/15 shadow-lg shadow-red-500/10'
                }`}>
                  {takingOrders
                    ? <Sun className="h-6 w-6 text-emerald-400 transition-all" />
                    : <Moon className="h-6 w-6 text-red-400 transition-all" />
                  }
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {takingOrders ? 'المطعم مفتوح — الطلبات نشطة' : 'المطعم مغلق — الطلبات موقوفة'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {takingOrders
                      ? 'العملاء يمكنهم تقديم الطلبات عبر النظام'
                      : 'حالة الطلب ستظهر للعملاء بأن المطعم مغلق'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{toggling ? 'جاري التحديث...' : ''}</span>
                <button
                  onClick={handleToggleOrders}
                  disabled={toggling}
                  className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
                    takingOrders
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                  } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                    takingOrders ? 'left-0.5' : 'right-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          WORKING HOURS
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}>
        <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-sm">مواعيد العمل</p>
                <p className="text-[11px] text-muted-foreground">تحديد أوقات العمل والإغلاق التلقائي</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sun className="h-3 w-3 text-emerald-400" />وقت الفتح
                </Label>
                <Input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
                  className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
              </div>
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Moon className="h-3 w-3 text-red-400" />وقت الإغلاق
                </Label>
                <Input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
                  className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
              </div>
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Bell className="h-3 w-3 text-amber-400" />الاشعار قبل (دقائق)
                </Label>
                <Input type="number" min={1} max={120} value={closeWarningMinutes}
                  onChange={e => setCloseWarningMinutes(Number(e.target.value))}
                  className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
              </div>
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-purple-400" />الإغلاق التلقائي (دقائق)
                </Label>
                <Input type="number" min={1} max={120} value={autoCloseMinutes}
                  onChange={e => setAutoCloseMinutes(Number(e.target.value))}
                  className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  الإغلاق التلقائي: قبل {closeTime} ب {autoCloseMinutes} دقيقة، سيتم إرسال تنبيه قبل {closeWarningMinutes} دقيقة
                </span>
              </div>
              <Button onClick={saveWorkSettings} disabled={savingWork}
                className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-8 text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20 shrink-0">
                {savingWork ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                حفظ المواعيد
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          LOYALTY POINTS
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.09 }}>
        <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Gift className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-sm">نقاط الولاء</p>
                <p className="text-[11px] text-muted-foreground">نظام النقاط للعملاء المسجلين — كل طلب يكسب نقاط تخصم من الفاتورة الجاية</p>
              </div>
              {!cashbackLoading && (
                <Badge variant="outline" className={`mr-auto h-6 text-xs border ${
                  cashbackEnabled
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-muted-foreground/30 text-muted-foreground bg-muted/20'
                }`}>
                  {cashbackEnabled ? '🟢 مفعل' : '⚪ غير مفعل'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {cashbackLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل الإعدادات...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/10 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      cashbackEnabled ? 'bg-emerald-500/15' : 'bg-muted/30'
                    }`}>
                      <Coins className={`h-5 w-5 ${cashbackEnabled ? 'text-emerald-400' : 'text-muted-foreground/50'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">تفعيل نظام النقاط</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">يكسب العميل نقاط كل ما يطلب، ويقدر يستخدمها خصم في المرات الجاية</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCashbackEnabled(!cashbackEnabled)}
                    className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
                      cashbackEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    } cursor-pointer`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                      cashbackEnabled ? 'left-0.5' : 'right-0.5'
                    }`} />
                  </button>
                </div>

                <div className={`space-y-4 transition-all duration-300 ${!cashbackEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                      <Label className="text-[10px] text-muted-foreground">كل كام جنيه يكسب نقطة؟</Label>
                      <div className="relative">
                        <Input type="number" min={1} value={cashbackThreshold}
                          onChange={e => setCashbackThreshold(Number(e.target.value))}
                          className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Coins className="h-3 w-3" />مثلاً 10 يعني كل 10 جنيه = 1 نقطة
                      </p>
                    </div>
                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                      <Label className="text-[10px] text-muted-foreground">النقطة الواحدة بكام جنيه؟</Label>
                      <div className="relative">
                        <Input type="number" min={0} step="0.01" value={cashbackAmount}
                          onChange={e => setCashbackAmount(Number(e.target.value))}
                          className="bg-muted/30 border-border/30 h-9 text-sm text-center rounded-xl" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Gift className="h-3 w-3" />مثلاً 0.10 يعني 1 نقطة = 10 قروش خصم
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Gift className="h-3.5 w-3.5 text-purple-400" />
                      <span>مع الإعدادات الحالية:</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs">
                      <span>طلب بـ <strong className="text-foreground">{cashbackThreshold * 5} جنيه</strong> ← يكسب <strong className="text-emerald-400">5</strong> نقاط</span>
                      <span>5 نقاط = خصم <strong className="text-emerald-400">{Number(cashbackAmount) * 5} جنيه</strong></span>
                    </div>
                  </div>
                </div>

                <Button onClick={saveCashback} disabled={savingCashback}
                  className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-9 text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20">
                  {savingCashback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ إعدادات النقاط
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
