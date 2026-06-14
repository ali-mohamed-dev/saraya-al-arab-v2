'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Ban, CheckCircle, Mail, DollarSign, Gift, Loader2, Search, X,
  Calendar, Phone, Shield, ShieldOff, UserCheck, UserX, Wallet, Trash2,
  ArrowUpDown, Eye, EyeOff, RefreshCw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface WebUser {
  id: string
  email: string
  name: string
  phone: string
  picture?: string
  isBlocked: boolean
  totalSpent: number
  pointsBalance?: number
  createdAt: string
}

function StatCard({ icon: Icon, label, value, color, badge }: { icon: any; label: string; value: string | number; color: string; badge?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${color.includes('border-') ? color : 'border-border/30'} bg-gradient-to-br ${color || 'from-card to-card'} p-3 sm:p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg sm:text-xl font-bold">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
        <div className={`h-8 w-8 rounded-xl bg-${color?.split(' ')[0]?.replace('text-', '') || 'muted'}/10 flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${color?.split(' ')[0] || 'text-muted-foreground'}`} />
        </div>
      </div>
      {badge && <Badge variant="outline" className="mt-2 text-[9px] h-5 border-border/30">{badge}</Badge>}
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-3 w-48 rounded bg-muted/40" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-muted/60" />
      </div>
    </div>
  )
}

export function UsersTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<WebUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBlocked, setShowBlocked] = useState(false)
  const [sortBy, setSortBy] = useState<'spent' | 'date' | 'name'>('spent')

  const sortedUsers = useMemo(() => {
    let list = showBlocked ? users : users.filter(u => !u.isBlocked)
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
    )
  }, [users, searchQuery, showBlocked])

  const filteredUsers = useMemo(() => {
    const list = [...sortedUsers]
    if (sortBy === 'spent') list.sort((a, b) => b.totalSpent - a.totalSpent)
    else if (sortBy === 'date') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [sortedUsers, sortBy])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/web-users')
      if (res.ok) setUsers(await res.json())
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل المستخدمين', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const deleteUser = async (user: WebUser) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${user.name || user.email}" نهائياً؟\n\n📧 ${user.email}\n💰 إجمالي الإنفاق: ${user.totalSpent.toFixed(0)} ج.م\n⭐ النقاط: ${user.pointsBalance || 0}\n\n🚫 لا يمكن التراجع عن هذا الإجراء!`)) return
    setDeleting(user.id)
    try {
      const res = await fetch(`/api/web-users/${user.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '🗑️ تم حذف المستخدم', description: user.email })
        fetchUsers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setDeleting(null) }
  }

  const toggleBlock = async (user: WebUser) => {
    if (!window.confirm(`هل أنت متأكد من ${user.isBlocked ? 'فك حظر' : 'حظر'} "${user.name || user.email}"؟`)) return
    setToggling(user.id)
    try {
      const res = await fetch(`/api/web-users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      })
      if (res.ok) {
        toast({ title: user.isBlocked ? '✅ تم فك الحظر' : '🔒 تم الحظر', description: user.email })
        fetchUsers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل التحديث', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setToggling(null) }
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => !u.isBlocked).length
  const blockedUsers = users.filter(u => u.isBlocked).length
  const totalRevenue = users.reduce((s, u) => s + u.totalSpent, 0)

  const fmtDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">المستخدمين</h1>
            <div className="h-3 w-28 mt-1 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card p-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-muted/60 mb-2" />
              <div className="h-6 w-12 rounded bg-muted/60" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">المستخدمين</h1>
            <p className="text-[11px] text-muted-foreground">{totalUsers} مستخدم · {activeUsers} نشط · {blockedUsers} محظور</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchUsers}
          className="h-9 w-9 p-0 border-border/40 rounded-xl">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Users} label="الإجمالي" value={totalUsers}
          color="text-blue-400 from-blue-500/10 border-blue-500/20"
          badge="كل المستخدمين" />
        <StatCard icon={UserCheck} label="نشط" value={activeUsers}
          color="text-emerald-400 from-emerald-500/10 border-emerald-500/20"
          badge={`${totalUsers ? Math.round(activeUsers / totalUsers * 100) : 0}%`} />
        <button onClick={() => setShowBlocked(!showBlocked)} className="text-right">
          <StatCard icon={UserX} label={showBlocked ? 'محظور (معروض)' : 'محظور'} value={blockedUsers}
            color={`${showBlocked ? 'text-rose-300 from-rose-500/10 border-rose-500/20' : 'text-red-400 from-red-500/10 border-red-500/20'}`}
            badge={showBlocked ? 'انقر للإخفاء' : 'انقر للإظهار'} />
        </button>
        <StatCard icon={Wallet} label="إجمالي الإنفاق" value={`${totalRevenue.toFixed(0)} ج.م`}
          color="text-[#D4AF37] from-[#D4AF37]/10 border-[#D4AF37]/20"
          badge={`معدل ${totalUsers ? (totalRevenue / totalUsers).toFixed(0) : 0} ج.م/مستخدم`} />
      </motion.div>

      {/* ── Search + Filter ────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الإيميل أو رقم التلفون..."
            className="bg-muted/30 border-border/30 pr-10 pl-9 h-10 text-sm rounded-xl focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
            dir="rtl" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowBlocked(!showBlocked)}
          className={`h-10 shrink-0 rounded-xl border px-3 flex items-center gap-1.5 text-xs font-bold transition-all ${
            showBlocked
              ? 'border-rose-400/30 text-rose-400 bg-rose-500/10 shadow-sm'
              : 'border-border/30 text-muted-foreground hover:text-red-400 hover:border-red-400/30'
          }`}>
          {showBlocked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {blockedUsers}
        </button>
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="h-10 rounded-xl border border-border/30 bg-muted/30 px-3 text-xs appearance-none cursor-pointer">
            <option value="spent">💰 الإنفاق</option>
            <option value="date">📅 التاريخ</option>
            <option value="name">🔤 الاسم</option>
          </select>
          <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
        </div>
      </motion.div>

      {/* ── Users List ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {filteredUsers.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
              {searchQuery ? <Search className="h-10 w-10 text-muted-foreground/20" /> : <Users className="h-10 w-10 text-muted-foreground/20" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين مسجلين'}
            </p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-[#D4AF37]">
                مسح البحث
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              عرض {filteredUsers.length} من {showBlocked ? `${blockedUsers} محظور` : `${activeUsers} نشط`}
            </p>
            <AnimatePresence>
              {filteredUsers.map((user, i) => (
                <motion.div key={user.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.025 }}>
                  <Card className={`border-border/30 overflow-hidden transition-all duration-200 hover:shadow-md ${
                    user.isBlocked ? 'bg-gradient-to-br from-red-500/[0.02] to-transparent opacity-70 border-red-500/10' : 'bg-gradient-to-br from-card to-muted/5'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center overflow-hidden transition-colors ${
                            user.isBlocked ? 'bg-red-500/10 ring-1 ring-red-500/20' : 'bg-emerald-500/10 ring-1 ring-emerald-500/20'
                          }`}>
                            {user.picture ? (
                              <img src={user.picture} alt="" className="h-full w-full object-cover" />
                            ) : user.isBlocked ? (
                              <ShieldOff className="h-5 w-5 text-red-400" />
                            ) : (
                              <Shield className="h-5 w-5 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm truncate">{user.name || 'بدون اسم'}</p>
                              <Badge variant="outline" className={`text-[10px] shrink-0 h-5 ${
                                user.isBlocked
                                  ? 'border-red-400/30 text-red-400 bg-red-500/5'
                                  : 'border-emerald-400/30 text-emerald-400 bg-emerald-500/5'
                              }`}>
                                {user.isBlocked ? 'محظور' : 'نشط'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                                <Mail className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1" dir="ltr">
                                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className="text-[11px] flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-emerald-500/60" />
                                <span className="font-medium text-foreground/80">{user.totalSpent.toFixed(0)}</span>
                                <span className="text-muted-foreground/60">ج.م</span>
                              </span>
                              <span className="text-[11px] flex items-center gap-1">
                                <Gift className="h-3 w-3 text-[#D4AF37]/60" />
                                <span className="font-medium text-foreground/80">{user.pointsBalance || 0}</span>
                                <span className="text-muted-foreground/60">نقطة</span>
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground/50" />
                                {fmtDate(user.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => toggleBlock(user)} disabled={toggling === user.id}
                            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${
                              user.isBlocked
                                ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400/50'
                                : 'border-red-400/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50'
                            }`}
                            title={user.isBlocked ? 'فك الحظر' : 'حظر'}>
                            {toggling === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isBlocked ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>
                          <button onClick={() => deleteUser(user)} disabled={deleting === user.id}
                            className="h-9 w-9 rounded-xl border border-border/30 text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 flex items-center justify-center transition-all disabled:opacity-50"
                            title="حذف المستخدم نهائياً">
                            {deleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
