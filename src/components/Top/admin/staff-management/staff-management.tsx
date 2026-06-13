'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, Users, UserPlus, Check, Shield, Trash2, KeyRound, Mail, Plus, X,
  Crown, UserCog, ChefHat, Coffee, Search, Ban, ShieldCheck, ShieldOff,
  Calendar, ChevronDown, ChevronUp, RefreshCw, LogIn
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ROLE_MAP } from '@/lib/saraya/constants'
import type { StaffMember } from '@/lib/saraya/types'

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Crown,
  CASHIER: UserCog,
  WAITER: Users,
  KITCHEN: ChefHat,
  BARISTA: Coffee,
}

const ROLE_BG: Record<string, string> = {
  ADMIN: 'from-red-500/20 to-red-600/5 border-red-500/20',
  CASHIER: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  WAITER: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  KITCHEN: 'from-orange-500/20 to-orange-600/5 border-orange-500/20',
  BARISTA: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-400 border-red-400/20',
  CASHIER: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20',
  WAITER: 'bg-blue-500/10 text-blue-400 border-blue-400/20',
  KITCHEN: 'bg-orange-500/10 text-orange-400 border-orange-400/20',
  BARISTA: 'bg-purple-500/10 text-purple-400 border-purple-400/20',
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className={`rounded-xl border ${color.includes('border-') ? color : 'border-border/40'} bg-gradient-to-br ${color} to-transparent p-3 sm:p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color.split(' ')[0]}`} />
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg sm:text-xl font-bold ${color.split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export function StaffManagement() {
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<string>('CASHIER')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      if (res.ok) {
        setStaff(await res.json())
      } else {
        toast({ title: 'خطأ', description: `فشل تحميل الموظفين (${res.status})`, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const filtered = staff.filter(m =>
    !search || m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  )

  const addStaff = async () => {
    if (!newUsername || !newPassword) return
    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      if (res.ok) {
        toast({ title: '✅ تم إضافة الإيميل', description: `${newUsername} — ${ROLE_MAP[newRole]?.label}` })
        setNewUsername(''); setNewPassword(''); setNewRole('CASHIER'); setShowAdd(false)
        fetchStaff()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: (data as { error?: string }).error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const updateStaff = async (id: string) => {
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (editRole) body.role = editRole
      if (editPassword) body.password = editPassword
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: '✅ تم التحديث' })
        setEditingId(null); setEditRole(''); setEditPassword('')
        fetchStaff()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل التحديث', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const deleteStaff = async (id: string, username: string) => {
    if (!confirm(`هل تريد حذف "${username}" نهائياً؟\n\n🚫 لا يمكن التراجع عن هذا الإجراء.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '🗑️ تم الحذف', description: username })
        fetchStaff()
      } else {
        toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setDeleting(null) }
  }

  const adminCount = staff.filter(s => s.role === 'ADMIN').length
  const activeCount = staff.filter(s => s.isActive).length
  const totalStaff = staff.length

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة الإيميلات</h1>
            <div className="h-3 w-24 rounded bg-muted/50 mt-1 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-muted mb-2" />
              <div className="h-6 w-10 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
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
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة الإيميلات</h1>
            <p className="text-[11px] text-muted-foreground">{totalStaff} موظف · {activeCount} نشط · {adminCount} أدمن</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchStaff}
            className="h-9 w-9 p-0 border-border/40">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}
            className={`gap-2 transition-all font-bold h-9 ${showAdd ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'} shadow-lg ${showAdd ? 'shadow-red-500/20' : 'shadow-[#D4AF37]/20'}`}>
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAdd ? 'إلغاء' : 'إضافة إيميل'}
          </Button>
        </div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Users} label="الإجمالي" value={String(totalStaff)} color="text-blue-400 from-blue-500/10 border-blue-500/20" sub="عدد الموظفين" />
        <StatCard icon={ShieldCheck} label="نشط" value={String(activeCount)} color="text-emerald-400 from-emerald-500/10 border-emerald-500/20" sub={`${totalStaff ? Math.round(activeCount / totalStaff * 100) : 0}%`} />
        <StatCard icon={Crown} label="أدمن" value={String(adminCount)} color="text-red-400 from-red-500/10 border-red-500/20" sub="صلاحية كاملة" />
        <StatCard icon={Shield} label="صلاحيات" value={String(Object.keys(new Set(staff.map(s => s.role))).length)} color="text-[#D4AF37] from-[#D4AF37]/10 border-[#D4AF37]/20" sub="أنواع مختلفة" />
      </motion.div>

      {/* ── Add Form ──────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  إضافة موظف جديد
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الإيميل / اسم المستخدم</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                        placeholder="example@email.com"
                        className="bg-muted/30 border-border/40 h-10 pr-10 rounded-xl" dir="ltr" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">كلمة المرور</Label>
                    <div className="relative">
                      <LogIn className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-muted/30 border-border/40 h-10 pr-10 rounded-xl" dir="ltr" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الصلاحية</Label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)}
                      className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm h-10 appearance-none">
                      <option value="CASHIER">💰 كاشير</option>
                      <option value="KITCHEN">👨‍🍳 مطبخ</option>
                      <option value="WAITER">🛎️ ويتر</option>
                      <option value="BARISTA">☕ باريستا</option>
                      <option value="ADMIN">👑 أدمن</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addStaff} disabled={saving || !newUsername || !newPassword}
                    className="flex-1 gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-10 shadow-lg shadow-[#D4AF37]/20 rounded-xl">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    إضافة الموظف
                  </Button>
                  <Button variant="outline" onClick={() => setShowAdd(false)}
                    className="border-border/40 text-muted-foreground h-10 rounded-xl">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بإسم المستخدم أو الصلاحية..."
          className="bg-muted/30 border-border/40 pr-12 h-10 text-sm rounded-xl focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
          dir="rtl" />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Staff List ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            {search ? <Search className="h-10 w-10 text-muted-foreground/20" /> : <Mail className="h-10 w-10 text-muted-foreground/20" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {search ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفين'}
          </p>
          {search ? (
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}
              className="mt-2 text-xs text-[#D4AF37]">مسح البحث</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}
              className="mt-2 text-xs text-[#D4AF37]">
              <Plus className="h-3 w-3 ml-1" />إضافة أول إيميل
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            عرض {filtered.length} من {totalStaff} موظف
          </p>
          <AnimatePresence>
            {filtered.map((member, i) => {
              const RoleIcon = ROLE_ICONS[member.role] || Shield
              const roleBg = ROLE_BG[member.role] || 'border-border/30'
              const roleBadge = ROLE_BADGE[member.role] || 'bg-muted/30 text-muted-foreground'
              return (
                <motion.div key={member.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: i * 0.03 }}>
                  <Card className={`border-border/40 bg-card overflow-hidden transition-all duration-200 hover:border-border/60 hover:shadow-sm ${!member.isActive ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      {editingId === member.id ? (
                        /* ── Inline Edit ─────────── */
                        <div className="space-y-3">
                          <p className="text-sm font-bold flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-[#D4AF37]" />
                            تعديل {member.username}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">تغيير الصلاحية</Label>
                              <select value={editRole || member.role} onChange={e => setEditRole(e.target.value)}
                                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm">
                                <option value="CASHIER">💰 كاشير</option>
                                <option value="BARISTA">☕ باريستا</option>
                                <option value="KITCHEN">👨‍🍳 مطبخ</option>
                                <option value="WAITER">🛎️ ويتر</option>
                                <option value="ADMIN">👑 أدمن</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">كلمة مرور جديدة</Label>
                              <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                                placeholder="اتركه فارغاً لعدم التغيير"
                                className="bg-muted/30 border-border/40 h-10 rounded-xl" dir="ltr" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateStaff(member.id)} disabled={saving}
                              className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 rounded-xl shadow-lg shadow-[#D4AF37]/20">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              حفظ التعديلات
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditRole(''); setEditPassword('') }}
                              className="border-border/40 text-muted-foreground rounded-xl">إلغاء</Button>
                          </div>
                        </div>
                      ) : (
                        /* ── Card Display ────────── */
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${roleBg} flex items-center justify-center`}>
                              <RoleIcon className={`h-5 w-5 ${roleBadge.split(' ')[1] || 'text-muted-foreground'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate" dir="ltr">{member.username}</p>
                                <Badge variant="outline" className={`shrink-0 text-[10px] h-5 ${roleBadge}`}>
                                  {ROLE_MAP[member.role]?.label || member.role}
                                </Badge>
                                {!member.isActive && (
                                  <Badge variant="outline" className="shrink-0 text-[10px] h-5 border-red-400/30 text-red-400 bg-red-500/5">
                                    <Ban className="h-2.5 w-2.5 ml-0.5" />غير نشط
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground/50" />
                                  {new Date(member.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => { setEditingId(member.id); setEditRole(member.role) }}
                              className="h-9 w-9 rounded-xl border border-border/40 text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 flex items-center justify-center transition-all"
                              title="تعديل">
                              <KeyRound className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteStaff(member.id, member.username)} disabled={deleting === member.id}
                              className="h-9 w-9 rounded-xl border border-border/40 text-muted-foreground hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 flex items-center justify-center transition-all disabled:opacity-50"
                              title="حذف">
                              {deleting === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
