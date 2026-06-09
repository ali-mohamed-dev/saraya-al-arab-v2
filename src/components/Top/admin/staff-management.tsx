'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Users, UserPlus, Check, Shield, Trash2, KeyRound } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ROLE_MAP } from '@/lib/saraya/constants'
import type { StaffMember } from '@/lib/saraya/types'

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

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      if (res.ok) setStaff(await res.json())
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStaff() }, [fetchStaff])

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
        toast({ title: 'تم إضافة الموظف', description: `${newUsername} — ${ROLE_MAP[newRole]?.label}` })
        setNewUsername(''); setNewPassword(''); setNewRole('CASHIER')
        setShowAdd(false); fetchStaff()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: (data as { error?: string }).error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة الموظف', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
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
        toast({ title: 'تم التحديث' })
        setEditingId(null); setEditRole(''); setEditPassword('')
        fetchStaff()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في التحديث', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteStaff = async (id: string, username: string) => {
    if (!confirm(`هل تريد حذف ${username}؟`)) return
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم الحذف' })
        fetchStaff()
      } else {
        toast({ title: 'خطأ', description: 'فشل في حذف الموظف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#D4AF37] flex items-center gap-2">
          <Users className="h-5 w-5" />إدارة الموظفين ({staff.length})
        </h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}
          className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
          <UserPlus className="h-4 w-4" />إضافة موظف
        </Button>
      </div>

      {/* Add Staff Form */}
      {showAdd && (
        <Card className="border-[#D4AF37]/30 bg-[#D4AF37]/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2"><UserPlus className="h-4 w-4" />موظف جديد</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">اسم المستخدم</Label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="cashier1" className="bg-muted/50 border-border/50" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">كلمة المرور</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" className="bg-muted/50 border-border/50" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الصلاحية</Label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-muted/50 p-2 text-sm text-right">
                <option value="CASHIER">كاشير</option>
                <option value="KITCHEN">مطبخ</option>
                <option value="WAITER">ويتر</option>
                <option value="BARISTA">باريستا</option>
                <option value="ADMIN">أدمن</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addStaff} disabled={saving || !newUsername || !newPassword}
                className="flex-1 gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}حفظ
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-muted-foreground">إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <div className="space-y-2">
        {staff.map(member => (
          <Card key={member.id} className="border-border/40 bg-card">
            <CardContent className="p-4">
              {editingId === member.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">تغيير الصلاحية</Label>
                      <select value={editRole || member.role} onChange={e => setEditRole(e.target.value)}
                        className="w-full rounded-lg border border-border/50 bg-muted/50 p-2 text-sm text-right">
                        <option value="CASHIER">كاشير</option>
                        <option value="BARISTA">باريستا</option>
                        <option value="KITCHEN">مطبخ</option>
                        <option value="WAITER">ويتر</option>
                        <option value="ADMIN">أدمن</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">كلمة مرور جديدة (اختياري)</Label>
                      <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="اتركه فارغاً لعدم التغيير" className="bg-muted/50 border-border/50 h-9" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStaff(member.id)} disabled={saving}
                      className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditRole(''); setEditPassword('') }} className="text-muted-foreground">إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium" dir="ltr">{member.username}</p>
                      <span className={`text-xs font-bold ${ROLE_MAP[member.role]?.color || 'text-muted-foreground'}`}>
                        {ROLE_MAP[member.role]?.label || member.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(member.id); setEditRole(member.role) }}
                      className="gap-1.5 border-border/50 text-muted-foreground hover:text-[#D4AF37] h-8">
                      <KeyRound className="h-3.5 w-3.5" />تعديل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteStaff(member.id, member.username)}
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

