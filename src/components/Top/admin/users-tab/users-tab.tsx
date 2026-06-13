'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Ban, CheckCircle, Mail, DollarSign, Gift, Loader2, Search, X, Calendar, Phone, Shield, ShieldOff, UserCheck, UserX, Wallet, Trash2 } from 'lucide-react'
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${color} bg-gradient-to-br ${color.replace('text-', 'from-').replace('border-', '')}/5 to-transparent p-3 sm:p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-muted" />
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

  const filteredUsers = useMemo(() => {
    let list = showBlocked ? users : users.filter(u => !u.isBlocked)
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
    )
  }, [users, searchQuery, showBlocked])

  const fetchUsers = async () => {
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
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#D4AF37]" />
          <h2 className="text-lg font-bold">المستخدمين</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-3 sm:p-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-muted mb-2" />
              <div className="h-6 w-12 rounded bg-muted" />
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
        className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">المستخدمين</h1>
            <p className="text-[11px] text-muted-foreground">{totalUsers} مستخدم مسجل</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Users} label="الإجمالي" value={totalUsers} color="text-blue-400 border-blue-400/20" />
        <StatCard icon={UserCheck} label="نشط" value={activeUsers} color="text-emerald-400 border-emerald-400/20" />
        <button onClick={() => setShowBlocked(!showBlocked)} className="text-right">
          <StatCard icon={UserX} label={showBlocked ? 'محظور (ظهر)' : 'محظور'} value={blockedUsers} color={`${showBlocked ? 'text-red-300 border-red-300/30' : 'text-red-400 border-red-400/20'}`} />
        </button>
        <StatCard icon={Wallet} label="إجمالي الإنفاق" value={`${totalRevenue.toFixed(0)} ج.م`} color="text-[#D4AF37] border-[#D4AF37]/20" />
      </div>

      {/* ── Search + Filter ────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الإيميل أو رقم التلفون..."
            className="bg-muted/30 border-border/40 pr-9 pl-9 h-10 text-sm rounded-xl focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
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
              ? 'border-red-400/30 text-red-400 bg-red-500/10'
              : 'border-border/40 text-muted-foreground hover:text-red-400 hover:border-red-400/30'
          }`}>
          <Ban className="h-3.5 w-3.5" />
          {blockedUsers}
        </button>
      </div>

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
            className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {showBlocked ? `عرض ${filteredUsers.length} محظور` : `عرض ${filteredUsers.length} من ${activeUsers} نشط`}
            </p>
            {filteredUsers.map((user, i) => (
              <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
                <Card className={`border-border/40 bg-card overflow-hidden transition-all duration-200 hover:border-border/60 hover:shadow-sm ${user.isBlocked ? 'opacity-70' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center overflow-hidden bg-muted transition-colors ${user.isBlocked ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
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
                            <Badge variant="outline" className={`text-[10px] shrink-0 h-5 ${user.isBlocked ? 'border-red-400/30 text-red-400 bg-red-500/5' : 'border-emerald-400/30 text-emerald-400 bg-emerald-500/5'}`}>
                              {user.isBlocked ? 'محظور' : 'نشط'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 truncate max-w-[160px] sm:max-w-[220px]">
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1" dir="ltr">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                {user.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1 shrink-0">
                              <DollarSign className="h-3 w-3 text-emerald-500/60" />
                              <span className="font-medium text-foreground/80">{user.totalSpent.toFixed(0)}</span> ج.م
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Gift className="h-3 w-3 text-[#D4AF37]/60" />
                              <span className="font-medium text-foreground/80">{user.pointsBalance || 0}</span> نقطة
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3 text-muted-foreground/60" />
                              {fmtDate(user.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => toggleBlock(user)} disabled={toggling === user.id}
                        className={`w-full sm:w-auto gap-1.5 text-xs border-border/40 h-9 rounded-xl transition-all ${
                          user.isBlocked
                            ? 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-500/5'
                            : 'text-red-400 hover:text-red-300 hover:border-red-400/30 hover:bg-red-500/5'
                        }`}>
                        {toggling === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : user.isBlocked ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        {user.isBlocked ? 'فك الحظر' : 'حظر'}
                      </Button>
                      <button onClick={() => deleteUser(user)} disabled={deleting === user.id}
                        className="h-9 w-9 rounded-xl border border-border/40 text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 flex items-center justify-center transition-all disabled:opacity-50"
                        title="حذف المستخدم نهائياً">
                        {deleting === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
