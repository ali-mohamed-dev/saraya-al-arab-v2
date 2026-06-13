import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { OAuth2Client } from 'google-auth-library'

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return new Response('Google OAuth not configured', { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return redirectHtml(JSON.stringify({ error: 'تم إلغاء تسجيل الدخول أو حدث خطأ' }))
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

  try {
    const client = new OAuth2Client(clientId, clientSecret, redirectUri)
    const { tokens } = await client.getToken(code)
    if (!tokens.id_token) throw new Error('No ID token')

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    })
    const payload = ticket.getPayload()
    if (!payload?.email) throw new Error('No email in token')

    const email = payload.email
    const name = payload.name || email.split('@')[0]
    const picture = payload.picture || ''

    let user = await db.webUser.findUnique({ where: { email } })
    if (user) {
      if (user.isBlocked) return redirectHtml(JSON.stringify({ error: 'هذا الحساب محظور' }))
      await db.webUser.update({ where: { id: user.id }, data: { name, picture } })
    } else {
      user = await db.webUser.create({
        data: { email, password: '', name, phone: '', picture },
      })
    }

    return redirectHtml(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      picture: user.picture,
      totalSpent: user.totalSpent,
      pointsBalance: user.pointsBalance,
    }))
  } catch (err) {
    console.error('Google callback error:', err)
    return redirectHtml(JSON.stringify({ error: 'فشل تسجيل الدخول بجوجل' }))
  }
}

function redirectHtml(userDataJson: string) {
  return new Response(
    `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>جاري تسجيل الدخول...</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#D4AF37;font-family:sans-serif;font-size:18px}.spinner{width:40px;height:40px;border:4px solid rgba(212,175,55,0.2);border-top-color:#D4AF37;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:16px}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div style="text-align:center"><div class="spinner"></div><div>جاري تسجيل الدخول...</div></div><script>
const data = ${userDataJson};
if (data.error) {
  alert(data.error);
  window.location.href = '/';
} else {
  sessionStorage.setItem('web-user-auth', 'true');
  sessionStorage.setItem('web-user-data', JSON.stringify(data));
  window.location.href = '/';
}
</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
