import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ==============================
// Cloudinary Upload API Route
// POST /api/upload
// ==============================

export async function POST(req: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary غير مُهيَّأ. تأكد من متغيرات البيئة.' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال أي ملف' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. يُرجى رفع صورة JPEG أو PNG أو WebP' },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' },
        { status: 400 }
      )
    }

    // Prepare signed upload
    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'saraya'

    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto
      .createHash('sha256')
      .update(signaturePayload)
      .digest('hex')

    // Convert file to buffer → blob for fetch
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })

    const uploadForm = new FormData()
    uploadForm.append('file', blob, file.name)
    uploadForm.append('api_key', apiKey)
    uploadForm.append('timestamp', String(timestamp))
    uploadForm.append('signature', signature)
    uploadForm.append('folder', folder)

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: uploadForm,
      }
    )

    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      console.error('Cloudinary error:', uploadData)
      return NextResponse.json(
        { error: uploadData.error?.message || 'فشل رفع الصورة على Cloudinary' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl: uploadData.secure_url,
      publicId: uploadData.public_id,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 })
  }
}
