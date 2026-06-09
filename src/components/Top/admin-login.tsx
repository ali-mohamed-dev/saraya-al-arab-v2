'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, Eye, EyeOff, Loader2, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface AdminLoginProps {
  onLogin: (role: string, username: string) => void
  onBack?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير',
  WAITER: 'ويتر',
  CASHIER: 'كاشير',
  KITCHEN: 'مطبخ',
  BARISTA: 'باريستا',
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

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
        setError(data.error || 'فشل في تسجيل الدخول')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      {/* Theme toggle in top corner */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-[#D4AF37]/20 bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          <CardHeader className="text-center pb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4AF37]/10">
              <Lock className="h-8 w-8 text-[#D4AF37]" />
              
            </div>
            <CardTitle className="text-2xl font-bold text-[#D4AF37]" dir="rtl">
              دخول الموظفين
            </CardTitle>
            <p className="text-sm text-muted-foreground" dir="rtl">
              توب - نظام إدارة المطعم
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  اسم المستخدم
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="bg-muted border-border/50 pr-10"
                    dir="ltr"
                    required
                  />
                  <UtensilsCrossed className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-muted border-border/50 pr-10"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-6 text-base font-bold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                تسجيل الدخول
              </Button>

              
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

