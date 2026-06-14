'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Phone, DollarSign, ArrowRight, LogOut, Loader2, ShoppingBag,
  MapPin, Plus, Pencil, Trash2, X, Check, Gift, Star, Home, Briefcase,
  MapPinned, CreditCard, Clock, BadgeCheck
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'
import { useToast } from '@/hooks/use-toast'

interface UserData {
  id: string
  email: string
  name: string
  phone: string
  picture?: string
  totalSpent: number
  pointsBalance?: number
}

interface Address {
  id: string
  userId: string
  label: string
  address: string
}

interface UserProfileProps {
  onLogout: () => void
  onBack: () => void
}

const LABEL_ICONS: Record<string, any> = {
  'المنزل': Home,
  'العمل': Briefcase,
  'أخرى': MapPinned,
}

export function UserProfile({ onLogout, onBack }: UserProfileProps) {
  const { toast } = useToast()
  const [user, setUser] = useState<UserData | null>(null)
  const [avatarError, setAvatarError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)

  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newLabel, setNewLabel] = useState('المنزل')
  const [newAddress, setNewAddress] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editAddress, setEditAddress] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('web-user-data')
    if (raw) {
      try {
        const u = JSON.parse(raw)
        setUser(u)
        setPhoneDraft(u.phone || '')
        setNameDraft(u.name || '')
        if (u.id) {
          fetch(`/api/web-users/${u.id}`).then(r => r.ok ? r.json() : null).then(data => {
            if (data) {
              setUser(prev => prev ? { ...prev, ...data } : data)
              sessionStorage.setItem('web-user-data', JSON.stringify(data))
            }
          }).catch((err) => console.warn('Profile: failed to fetch latest user data', err))
        }
      } catch (err) { console.warn('Profile: failed to parse user data', err) }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.id) fetchAddresses()
  }, [user?.id])

  const fetchAddresses = async () => {
    if (!user?.id) return
    setLoadingAddresses(true)
    try {
      const res = await fetch(`/api/addresses?userId=${user.id}`)
      if (res.ok) setAddresses(await res.json())
    } catch (err) { console.warn('Profile: failed to fetch addresses', err) } finally { setLoadingAddresses(false) }
  }

  const updateSessionUser = (updates: Partial<UserData>) => {
    if (!user) return
    const newUser = { ...user, ...updates }
    setUser(newUser)
    sessionStorage.setItem('web-user-data', JSON.stringify(newUser))
  }

  const savePhone = async () => {
    if (!user) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/web-users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDraft }),
      })
      if (res.ok) {
        const data = await res.json()
        updateSessionUser({ phone: data.phone })
        toast({ title: '✅ تم الحفظ', description: 'تم تحديث رقم الهاتف' })
        setEditingPhone(false)
      } else {
        toast({ title: 'خطأ', description: 'فشل في تحديث رقم الهاتف', variant: 'destructive' })
      }
    } catch (err) { console.warn('Profile: failed to save phone', err); toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' }) } finally { setSavingPhone(false) }
  }

  const saveName = async () => {
    if (!user) return
    setSavingName(true)
    try {
      const res = await fetch(`/api/web-users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft }),
      })
      if (res.ok) {
        const data = await res.json()
        updateSessionUser({ name: data.name })
        toast({ title: '✅ تم الحفظ', description: 'تم تحديث الاسم' })
        setEditingName(false)
      } else {
        toast({ title: 'خطأ', description: 'فشل في تحديث الاسم', variant: 'destructive' })
      }
    } catch (err) { console.warn('Profile: failed to save name', err); toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' }) } finally { setSavingName(false) }
  }

  const addAddress = async () => {
    if (!user || !newAddress.trim()) return
    setSavingAddress(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, label: newLabel, address: newAddress.trim() }),
      })
      if (res.ok) {
        const addr = await res.json()
        setAddresses(prev => [addr, ...prev])
        setShowAddAddress(false)
        setNewLabel('المنزل')
        setNewAddress('')
        toast({ title: '✅ تمت الإضافة', description: 'تم إضافة العنوان' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في إضافة العنوان', variant: 'destructive' })
      }
    } catch (err) { console.warn('Profile: failed to add address', err); toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' }) } finally { setSavingAddress(false) }
  }

  const saveAddress = async (id: string) => {
    if (!editAddress.trim()) return
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel, address: editAddress.trim() }),
      })
      if (res.ok) {
        setAddresses(prev => prev.map(a => a.id === id ? { ...a, label: editLabel, address: editAddress.trim() } : a))
        setEditingAddressId(null)
        toast({ title: '✅ تم التعديل', description: 'تم تحديث العنوان' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في تعديل العنوان', variant: 'destructive' })
      }
    } catch (err) { console.warn('Profile: failed to update address', err); toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' }) } finally {}
  }

  const deleteAddress = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العنوان؟')) return
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== id))
        toast({ title: '🗑️ تم الحذف', description: 'تم حذف العنوان' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في حذف العنوان', variant: 'destructive' })
      }
    } catch (err) { console.warn('Profile: failed to delete address', err); toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' }) }
  }

  const startEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id)
    setEditLabel(addr.label)
    setEditAddress(addr.address)
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-[#D4AF37]/10 animate-pulse mx-auto" />
          <div className="h-4 w-32 rounded bg-muted/60 animate-pulse mx-auto" />
          <div className="h-3 w-48 rounded bg-muted/40 animate-pulse mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <User className="h-16 w-16 text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground">لم يتم تسجيل الدخول</p>
          <Button variant="outline" onClick={onBack} className="gap-2">العودة</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/10" dir="rtl">
      {/* ══ Header ═══════════════════════ */}
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack}
              className="h-9 w-9 rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all">
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-[#D4AF37]/20">
                {user?.picture && !avatarError ? (
                  <img src={user.picture} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} />
                ) : (
                  <div className="h-full w-full bg-[#D4AF37]/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-bold text-sm">الملف الشخصي</h1>
                <p className="text-[10px] text-muted-foreground">{user?.name || 'مستخدم'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button onClick={onLogout}
              className="h-9 w-9 rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-400/30 transition-all"
              title="تسجيل خروج">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
        {/* ══ Profile Card ═══════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <div className="h-full w-full rounded-full overflow-hidden ring-2 ring-[#D4AF37]/20">
                    {user.picture && !avatarError ? (
                      <img src={user.picture} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
                        <User className="h-8 w-8 text-[#D4AF37]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex gap-2 items-center">
                      <Input value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                        className="h-8 text-sm bg-muted/30 border-border/30 rounded-xl flex-1" />
                      <button onClick={saveName} disabled={savingName}
                        className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all">
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setEditingName(false); setNameDraft(user.name || '') }}
                        className="h-8 w-8 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold truncate">{user.name || 'بدون اسم'}</h2>
                      <button onClick={() => setEditingName(true)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 flex items-center justify-center transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-muted/30 to-transparent border border-border/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground">إجمالي المشتريات</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{user.totalSpent?.toFixed(0) || 0} ج.م</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-muted/30 to-transparent border border-border/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="h-4 w-4 text-[#D4AF37]" />
                    <span className="text-[10px] text-muted-foreground">نقاط الولاء</span>
                  </div>
                  <p className="text-lg font-bold text-[#D4AF37]">{user.pointsBalance || 0} نقطة</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                  <div className="h-9 w-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">البريد الإلكتروني</p>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                  <div className="h-9 w-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">رقم الهاتف</p>
                    {editingPhone ? (
                      <div className="flex gap-2 items-center mt-1">
                        <Input value={phoneDraft} onChange={e => setPhoneDraft(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          dir="ltr" className="h-8 text-sm bg-muted/30 border-border/30 rounded-xl w-40"
                          placeholder="01000000000" />
                        <button onClick={savePhone} disabled={savingPhone}
                          className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all">
                          {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button onClick={() => { setEditingPhone(false); setPhoneDraft(user.phone || '') }}
                          className="h-8 w-8 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" dir="ltr">{user.phone || '—'}</p>
                        <button onClick={() => setEditingPhone(true)}
                          className="text-muted-foreground hover:text-[#D4AF37] transition-all">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ══ Addresses ═══════════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <h3 className="font-bold text-sm">عناويني</h3>
                </div>
                <button onClick={() => setShowAddAddress(!showAddAddress)}
                  className={`h-8 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                    showAddAddress
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10'
                  }`}>
                  {showAddAddress ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showAddAddress ? 'إلغاء' : 'إضافة'}
                </button>
              </div>

              <AnimatePresence>
                {showAddAddress && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden rounded-xl bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent border border-[#D4AF37]/10 p-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">تسمية العنوان</Label>
                      <div className="relative">
                        <select value={newLabel} onChange={e => setNewLabel(e.target.value)}
                          className="w-full rounded-xl border border-border/30 bg-muted/30 h-9 px-3 text-sm appearance-none">
                          <option value="المنزل">🏠 المنزل</option>
                          <option value="العمل">💼 العمل</option>
                          <option value="أخرى">📍 أخرى</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">العنوان</Label>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input value={newAddress} onChange={e => setNewAddress(e.target.value)}
                          placeholder="اكتب العنوان بالتفصيل"
                          className="bg-muted/30 border-border/30 h-9 text-sm pr-10 rounded-xl" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addAddress} disabled={savingAddress || !newAddress.trim()}
                        size="sm"
                        className="flex-1 gap-1.5 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold text-xs h-8 rounded-xl shadow-lg shadow-[#D4AF37]/20">
                        {savingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        حفظ العنوان
                      </Button>
                      <Button onClick={() => setShowAddAddress(false)}
                        size="sm" variant="outline"
                        className="border-border/30 text-muted-foreground h-8 rounded-xl">
                        إلغاء
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingAddresses ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground">لا توجد عناوين</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">أضف عنوانك الأول لسهولة الطلب</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map(addr => {
                    const LabelIcon = LABEL_ICONS[addr.label] || MapPin
                    const labelColors: Record<string, string> = {
                      'المنزل': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      'العمل': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      'أخرى': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                    }
                    const colorClass = labelColors[addr.label] || 'text-muted-foreground bg-muted/30 border-border/30'

                    return (
                      <motion.div key={addr.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="rounded-xl bg-gradient-to-br from-muted/20 to-transparent border border-border/20 p-3">
                          {editingAddressId === addr.id ? (
                            <div className="space-y-2">
                              <select value={editLabel} onChange={e => setEditLabel(e.target.value)}
                                className="w-full rounded-xl border border-border/30 bg-muted/30 h-8 px-2 text-xs appearance-none">
                                <option value="المنزل">🏠 المنزل</option>
                                <option value="العمل">💼 العمل</option>
                                <option value="أخرى">📍 أخرى</option>
                              </select>
                              <Input value={editAddress} onChange={e => setEditAddress(e.target.value)}
                                className="h-8 text-xs bg-muted/30 border-border/30 rounded-xl" />
                              <div className="flex gap-1.5">
                                <button onClick={() => saveAddress(addr.id)}
                                  className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setEditingAddressId(null)}
                                  className="h-7 w-7 rounded-lg bg-muted/30 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                  <LabelIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold">{addr.label}</p>
                                    <Badge variant="outline" className={`text-[8px] h-4 border ${colorClass}`}>
                                      {addr.label}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{addr.address}</p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => startEditAddress(addr)}
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 flex items-center justify-center transition-all">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => deleteAddress(addr.id)}
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center transition-all">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ══ Orders ═══════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <h3 className="font-bold text-sm text-muted-foreground">طلباتك</h3>
              <p className="text-xs text-muted-foreground/60 mt-1">سيتم إضافة سجل الطلبات قريباً</p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
