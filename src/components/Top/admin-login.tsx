'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Lock, Eye, EyeOff, Loader2, UtensilsCrossed, User, Phone, UserPlus, LogIn, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'
import { useToast } from '@/hooks/use-toast'

interface AdminLoginProps {
  onLogin: (role: string, username: string) => void
  onUserLogin: (data: { id: string; email: string; name: string }) => void
  onBack?: () => void
}

export function AdminLogin({ onLogin, onUserLogin, onBack }: AdminLoginProps) {
  const { toast } = useToast()

  // Step: 'email' | 'password' | 'register'
  const [step, setStep] = useState<'email' | 'password' | 'register'>('email')
  const [email, setEmail] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Customer auth
  const [custPassword, setCustPassword] = useState('')
  const [showCustPassword, setShowCustPassword] = useState(false)
  const [custLoading, setCustLoading] = useState(false)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Staff login (expandable)
  const [showStaff, setShowStaff] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState('')

  // Listen for Google OAuth redirect result
  useEffect(() => {
    const raw = sessionStorage.getItem('web-user-auth')
    if (raw === 'true') {
      const data = sessionStorage.getItem('web-user-data')
      if (data) onUserLogin(JSON.parse(data))
    }
  }, [])

  const handleCheckEmail = async () => {
    if (!email.trim()) return
    setCheckingEmail(true)
    try {
      const res = await fetch('/api/web-users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.exists && !data.blocked) {
        setStep('password')
      } else if (data.blocked) {
        toast({ title: 'محظور', description: 'هذا الحساب محظور', variant: 'destructive' })
      } else {
        setStep('register')
      }
    } catch (err) {
      console.error('Email check error:', err)
      toast({ title: 'خطأ', description: 'فشل التحقق من البريد', variant: 'destructive' })
    } finally { setCheckingEmail(false) }
  }

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCustLoading(true)
    try {
      const res = await fetch('/api/web-users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: custPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'خطأ', description: data.error, variant: 'destructive' }); return }
      sessionStorage.setItem('web-user-auth', 'true')
      sessionStorage.setItem('web-user-data', JSON.stringify(data))
      onUserLogin(data)
    } catch (err) {
      console.error('Customer login error:', err)
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' })
    } finally { setCustLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setCustLoading(true)
    try {
      const res = await fetch('/api/web-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: regPassword, name: custName, phone: custPhone }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'خطأ', description: data.error || 'فشل إنشاء الحساب', variant: 'destructive' }); return }
      toast({ title: 'تم التسجيل', description: 'تم إنشاء الحساب بنجاح' })
      sessionStorage.setItem('web-user-auth', 'true')
      sessionStorage.setItem('web-user-data', JSON.stringify({ id: data.id, email: data.email, name: data.name, phone: data.phone, totalSpent: 0, pointsBalance: 0 }))
      onUserLogin({ id: data.id, email: data.email, name: data.name })
    } catch (err) {
      console.error('Register error:', err)
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' })
    } finally { setCustLoading(false) }
  }

  const handleGuest = async () => {
    setCustLoading(true)
    try {
      const res = await fetch('/api/web-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: `guest_${Date.now()}`, name: custName || 'ضيف', phone: custPhone }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'خطأ', description: data.error || 'فشل', variant: 'destructive' }); return }
      toast({ title: 'مرحباً', description: 'تم تسجيل الدخول كضيف' })
      sessionStorage.setItem('web-user-auth', 'true')
      sessionStorage.setItem('web-user-data', JSON.stringify({ id: data.id, email: data.email, name: data.name, phone: data.phone, totalSpent: 0, pointsBalance: 0 }))
      onUserLogin({ id: data.id, email: data.email, name: data.name })
    } catch (err) {
      console.error('Guest login error:', err)
      toast({ title: 'خطأ', description: 'حدث خطأ في الاتصال', variant: 'destructive' })
    } finally { setCustLoading(false) }
  }

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStaffError('')
    setStaffLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.authenticated) {
        sessionStorage.setItem('saraya-staff-role', data.role || 'ADMIN')
        sessionStorage.setItem('saraya-staff-username', data.username)
        sessionStorage.setItem('saraya-admin-auth', 'true')
        onLogin(data.role || 'ADMIN', data.username)
      } else {
        setStaffError(data.error || 'فشل في تسجيل الدخول')
      }
    } catch (err) {
      console.error('Staff login error:', err)
      setStaffError('حدث خطأ في الاتصال')
    } finally { setStaffLoading(false) }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="fixed top-4 left-4 z-50"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="border-[#D4AF37]/20 bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          <CardHeader className="text-center pb-2 pt-6">
            {onBack && (
              <button onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors absolute top-4 right-4"
                title="رجوع">
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/10">
              <User className="h-7 w-7 text-[#D4AF37]" />
            </div>
            <CardTitle className="text-xl font-bold text-[#D4AF37]" dir="rtl">
              {step === 'email' ? 'توب - تسجيل الدخول' : step === 'password' ? 'أهلاً بك' : 'إنشاء حساب جديد'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google Sign-In */}
            {step === 'email' && (
              <>
                <a href="/api/auth/google"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-border/50 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  تسجيل الدخول بواسطة Google
                </a>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground">أو</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              </>
            )}

            <AnimatePresence mode="wait">
              {step === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3" dir="rtl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">البريد الإلكتروني</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="example@email.com" className="bg-muted border-border/50 h-10 text-sm" dir="ltr"
                      onKeyDown={e => { if (e.key === 'Enter') handleCheckEmail() }} />
                  </div>
                  <Button onClick={handleCheckEmail} disabled={checkingEmail || !email.trim()}
                    className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-5 text-sm font-bold disabled:opacity-50">
                    {checkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    متابعة
                  </Button>
                </motion.div>
              )}

              {step === 'password' && (
                <motion.form key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleCustomerLogin} className="space-y-3" dir="rtl">
                  <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                    <p className="font-medium">{email}</p>
                    <button type="button" onClick={() => setStep('email')} className="text-xs text-[#D4AF37] hover:underline mt-1">تغيير البريد</button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Input type={showCustPassword ? 'text' : 'password'} value={custPassword}
                        onChange={e => setCustPassword(e.target.value)} placeholder="••••••••"
                        className="bg-muted border-border/50 pr-9 h-10 text-sm" dir="ltr" required />
                      <button type="button" onClick={() => setShowCustPassword(!showCustPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showCustPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={custLoading || !custPassword}
                    className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-5 text-sm font-bold disabled:opacity-50">
                    {custLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    تسجيل الدخول
                  </Button>
                </motion.form>
              )}

              {step === 'register' && (
                <motion.form key="register" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleRegister} className="space-y-3" dir="rtl">
                  <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                    <p className="font-medium">{email}</p>
                    <button type="button" onClick={() => setStep('email')} className="text-xs text-[#D4AF37] hover:underline mt-1">تغيير البريد</button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">الاسم (اختياري)</Label>
                    <div className="relative">
                      <Input value={custName} onChange={e => setCustName(e.target.value)} placeholder="الاسم بالكامل" className="bg-muted border-border/50 pr-9 h-10 text-sm" />
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">رقم الهاتف (اختياري)</Label>
                    <div className="relative">
                      <Input value={custPhone} onChange={e => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="01000000000" className="bg-muted border-border/50 pr-9 h-10 text-sm" dir="ltr" />
                      <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Input type={showRegPassword ? 'text' : 'password'} value={regPassword}
                        onChange={e => setRegPassword(e.target.value)} placeholder="••••••••"
                        className="bg-muted border-border/50 pr-9 h-10 text-sm" dir="ltr" required minLength={4} />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={custLoading || !regPassword}
                    className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-5 text-sm font-bold disabled:opacity-50">
                    {custLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    إنشاء حساب
                  </Button>
                  <Button type="button" onClick={handleGuest} disabled={custLoading}
                    variant="outline" className="w-full gap-2 border-border/50 py-4 text-xs text-muted-foreground">
                    {custLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    متابعة كضيف
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-border/30" />
            </div>

            {/* Staff login toggle */}
            <div className="text-center" dir="rtl">
              <button onClick={() => setShowStaff(!showStaff)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#D4AF37] transition-colors">
                <UtensilsCrossed className="h-3 w-3" />
                {showStaff ? 'إخفاء دخول الموظفين' : 'دخول الموظفين'}
                {showStaff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            <AnimatePresence>
              {showStaff && (
                <motion.form key="staff" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleStaffSubmit} className="space-y-3 overflow-hidden" dir="rtl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">اسم المستخدم</Label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin"
                      className="bg-muted border-border/50 h-9 text-sm" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                        className="bg-muted border-border/50 h-9 text-sm" dir="ltr" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {staffError && <p className="text-xs text-red-400 text-center">{staffError}</p>}
                  <Button type="submit" disabled={staffLoading || !username || !password}
                    className="w-full gap-2 bg-muted text-foreground hover:bg-muted/80 py-4 text-xs font-medium disabled:opacity-50">
                    {staffLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    دخول الموظفين
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
