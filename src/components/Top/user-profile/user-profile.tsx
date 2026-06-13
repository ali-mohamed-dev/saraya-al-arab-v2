'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Phone, DollarSign, ArrowRight, LogOut, Loader2, ShoppingBag, MapPin, Plus, Pencil, Trash2, X, Check, Gift } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function UserProfile({ onLogout, onBack }: UserProfileProps) {
  const { toast } = useToast()
  const [user, setUser] = useState<UserData | null>(null)
  const [avatarError, setAvatarError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)

  // Edit phone
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  // Edit profile name
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Add address
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newLabel, setNewLabel] = useState('المنزل')
  const [newAddress, setNewAddress] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  // Edit address
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
        // Fetch latest data (includes pointsBalance, etc.)
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
        toast({ title: 'تم الحفظ', description: 'تم تحديث رقم الهاتف' })
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
        toast({ title: 'تم الحفظ', description: 'تم تحديث الاسم' })
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
        toast({ title: 'تمت الإضافة', description: 'تم إضافة العنوان' })
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
        toast({ title: 'تم التعديل', description: 'تم تحديث العنوان' })
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
        toast({ title: 'تم الحذف', description: 'تم حذف العنوان' })
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

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="min-h-dvh bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-[#D4AF37]">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
              {user?.picture && !avatarError ? <img src={user.picture} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} /> : <User className="h-5 w-5 text-[#D4AF37]" />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#D4AF37]">الملف الشخصي</h1>
              <p className="text-xs text-muted-foreground">مرحباً {user?.name || 'مستخدم'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">تسجيل خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-[#D4AF37]/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden bg-[#D4AF37]/10">
                  {user?.picture && !avatarError ? <img src={user.picture} alt="" className="h-full w-full object-cover" onError={() => setAvatarError(true)} /> : <User className="h-8 w-8 text-[#D4AF37]" />}
                </div>
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex gap-2 items-center">
                      <Input value={nameDraft} onChange={e => setNameDraft(e.target.value)} className="h-8 text-sm bg-muted border-border/50" />
                      <button onClick={saveName} disabled={savingName} className="text-green-400 hover:text-green-300"><Check className="h-4 w-4" /></button>
                      <button onClick={() => { setEditingName(false); setNameDraft(user?.name || '') }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{user?.name || 'بدون اسم'}</h2>
                      <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-[#D4AF37]"><Pencil className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                  <Mail className="h-5 w-5 text-[#D4AF37]" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p className="text-sm font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                  <Phone className="h-5 w-5 text-[#D4AF37]" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    {editingPhone ? (
                      <div className="flex gap-2 items-center mt-1">
                        <Input value={phoneDraft} onChange={e => setPhoneDraft(e.target.value.replace(/\D/g, '').slice(0, 11))} dir="ltr" className="h-8 text-sm bg-muted border-border/50 w-40" placeholder="01000000000" />
                        <button onClick={savePhone} disabled={savingPhone} className="text-green-400 hover:text-green-300"><Check className="h-4 w-4" /></button>
                        <button onClick={() => { setEditingPhone(false); setPhoneDraft(user?.phone || '') }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" dir="ltr">{user?.phone || '—'}</p>
                        <button onClick={() => setEditingPhone(true)} className="text-muted-foreground hover:text-[#D4AF37]"><Pencil className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                  <DollarSign className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                    <p className="text-sm font-bold text-[#D4AF37]">{user?.totalSpent?.toFixed(0) || 0} ج.م</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                  <Gift className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-xs text-muted-foreground">نقاط الولاء</p>
                    <p className="text-sm font-bold text-[#D4AF37]">{user?.pointsBalance || 0} نقطة</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Addresses */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/40">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#D4AF37]" />
                  <h3 className="font-bold">عناويني</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAddAddress(true)} className="gap-1 border-[#D4AF37]/30 text-[#D4AF37] text-xs">
                  <Plus className="h-3.5 w-3.5" /> إضافة عنوان
                </Button>
              </div>

              <AnimatePresence>
                {showAddAddress && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden rounded-lg border border-[#D4AF37]/20 bg-muted/20 p-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">تسمية العنوان</Label>
                      <select value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full rounded-lg border border-border/50 bg-muted h-9 px-3 text-sm">
                        <option value="المنزل">المنزل</option>
                        <option value="العمل">العمل</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">العنوان</Label>
                      <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="اكتب العنوان بالتفصيل" className="bg-muted border-border/50 h-9 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addAddress} disabled={savingAddress || !newAddress.trim()} size="sm" className="bg-[#D4AF37] text-black hover:bg-[#C9A431] text-xs gap-1">
                        {savingAddress ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} حفظ
                      </Button>
                      <Button onClick={() => setShowAddAddress(false)} size="sm" variant="outline" className="text-xs">إلغاء</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingAddresses ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" /></div>
              ) : addresses.length === 0 ? (
                <div className="py-6 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">لا توجد عناوين. أضف عنوانك الأول.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map(addr => (
                    <div key={addr.id} className="rounded-lg border border-border/30 bg-muted/10 p-3">
                      {editingAddressId === addr.id ? (
                        <div className="space-y-2">
                          <select value={editLabel} onChange={e => setEditLabel(e.target.value)} className="w-full rounded-lg border border-border/50 bg-muted h-8 px-2 text-xs">
                            <option value="المنزل">المنزل</option>
                            <option value="العمل">العمل</option>
                            <option value="أخرى">أخرى</option>
                          </select>
                          <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} className="h-8 text-xs bg-muted border-border/50" />
                          <div className="flex gap-2">
                            <button onClick={() => saveAddress(addr.id)} className="text-green-400 hover:text-green-300"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setEditingAddressId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#D4AF37]">{addr.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{addr.address}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEditAddress(addr)} className="text-muted-foreground hover:text-[#D4AF37]"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => deleteAddress(addr.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders placeholder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/40">
            <CardContent className="p-6 text-center">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
              <h3 className="font-bold text-muted-foreground mb-1">طلباتك</h3>
              <p className="text-sm text-muted-foreground/60">سيتم إضافة سجل الطلبات قريباً</p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
