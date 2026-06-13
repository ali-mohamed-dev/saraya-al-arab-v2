'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, AlertTriangle, DoorClosed, Timer, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface SettingsData {
  takingOrders: boolean
  openTime: string
  closeTime: string
  closeWarningMinutes: number
  autoCloseMinutes: number
}

export function ClosingTimeAlert() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [extending, setExtending] = useState(false)
  const [newCloseTime, setNewCloseTime] = useState('')
  const [showChangeTime, setShowChangeTime] = useState(false)
  const [warningTriggered, setWarningTriggered] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) setSettings(await res.json())
    } catch (error) { console.error('closing-time-alert fetch error:', error) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const checkTime = useCallback(() => {
    if (!settings) return
    if (warningTriggered) return

    const now = new Date()
    const [closeH, closeM] = settings.closeTime.split(':').map(Number)
    const close = new Date(now.getFullYear(), now.getMonth(), now.getDate(), closeH, closeM, 0)
    const warnBefore = new Date(close.getTime() - settings.closeWarningMinutes * 60000)

    if (now >= warnBefore && now < close && settings.takingOrders) {
      setWarningTriggered(true)
      setShowDialog(true)
      setNewCloseTime(settings.closeTime)
    }
  }, [settings, warningTriggered])

  useEffect(() => {
    checkTime()
    const interval = setInterval(checkTime, 30000)
    return () => clearInterval(interval)
  }, [checkTime])

  useEffect(() => {
    if (!showDialog) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      return
    }
    const ms = (settings?.autoCloseMinutes ?? 10) * 60000
    closeTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ takingOrders: false }),
        })
        setShowDialog(false)
        setWarningTriggered(false)
        fetchSettings()
        toast({ title: 'إغلاق تلقائي', description: 'تم إغلاق المطعم تلقائيًا لانتهاء وقت العمل' })
      } catch (error) { console.error('closing-time-alert auto-close error:', error) }
    }, ms)
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }
  }, [showDialog, settings, toast, fetchSettings])

  const extendTime = async () => {
    setExtending(true)
    try {
      const [h, m] = settings!.closeTime.split(':').map(Number)
      const newH = h + 1
      const newClose = `${String(newH % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeTime: newClose }),
      })
      setWarningTriggered(false)
      setShowDialog(false)
      fetchSettings()
      toast({ title: 'تم التمديد', description: `تم تمديد وقت الإغلاق إلى ${newClose}` })
    } catch (error) { console.error('closing-time-alert extend error:', error) } finally {
      setExtending(false)
    }
  }

  const changeCloseTime = async () => {
    if (!newCloseTime) return
    setExtending(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeTime: newCloseTime }),
      })
      setWarningTriggered(false)
      setShowDialog(false)
      setShowChangeTime(false)
      fetchSettings()
      toast({ title: 'تم تغيير وقت الإغلاق', description: `وقت الإغلاق الجديد: ${newCloseTime}` })
    } catch (error) { console.error('closing-time-alert changeClose error:', error) } finally {
      setExtending(false)
    }
  }

  const dismissForever = () => {
    setWarningTriggered(false)
    setShowDialog(false)
    setShowChangeTime(false)
    toast({ title: 'تم التجاهل', description: 'لن يظهر اشعار اليوم مرة أخرى' })
  }

  if (!settings || !settings.takingOrders) return null

  const [closeH, closeM] = settings.closeTime.split(':').map(Number)
  const now = new Date()
  const closeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), closeH, closeM, 0)
  const diffMs = closeToday.getTime() - now.getTime()
  const minsLeft = Math.max(0, Math.floor(diffMs / 60000))

  return (
    <>
      {minsLeft <= settings.closeWarningMinutes && minsLeft > 0 && !showDialog && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-400">
            <Timer className="h-3 w-3 animate-pulse" />
            <span>الإغلاق بعد {minsLeft} دقيقة</span>
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              اقتراب موعد الإغلاق
            </DialogTitle>
            <DialogDescription>
              وقت الإغلاق المحدد: {settings.closeTime}. هل تود الاستمرار أو تغيير الوقت؟
              <br />
              <span className="text-xs text-muted-foreground">
                سيتم إغلاق المطعم تلقائيًا بعد {settings.autoCloseMinutes} دقائق في حال عدم الرد.
              </span>
            </DialogDescription>
          </DialogHeader>

          {showChangeTime ? (
            <div className="space-y-3 py-2">
              <Label>وقت الإغلاق الجديد</Label>
              <Input type="time" value={newCloseTime} onChange={e => setNewCloseTime(e.target.value)}
                className="bg-muted/50 border-border/50 text-center text-lg" />
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            {showChangeTime ? (
              <>
                <Button onClick={changeCloseTime} disabled={extending || !newCloseTime}
                  className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2">
                  {extending ? 'جاري الحفظ...' : <><Clock className="h-4 w-4" />حفظ الوقت الجديد</>}
                </Button>
                <Button variant="ghost" onClick={() => setShowChangeTime(false)}>رجوع</Button>
              </>
            ) : (
              <>
                <Button onClick={extendTime} disabled={extending}
                  className="bg-emerald-600 text-white hover:bg-emerald-500 gap-2">
                  <Plus className="h-4 w-4" />تمديد ساعة
                </Button>
                <Button onClick={() => setShowChangeTime(true)} variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" />تغيير وقت الإغلاق
                </Button>
                <Button onClick={dismissForever} variant="ghost" className="text-muted-foreground gap-2">
                  <X className="h-4 w-4" />تجاهل
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
