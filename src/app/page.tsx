import { db } from '@/lib/db'
import { ClientPage } from './client-page'
import type { Meal, Promotion } from '@/lib/saraya/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [meals, promotions, storeSettings] = await Promise.all([
    db.meal.findMany({
      select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.promotion.findMany({
      where: { isActive: true },
      select: { id: true, bannerImageUrl: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, oldPrice: true, discount: true, isActive: true, buttonText: true, buttonTextAr: true, buttonLink: true, createdAt: true, mealItems: { select: { id: true, mealId: true, meal: { select: { id: true, title: true, titleAr: true, description: true, descriptionAr: true, price: true, prepTime: true, category: true, categoryAr: true, preparationArea: true, imageUrl: true, isActive: true } } } } },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promotion[],
    db.storeSettings.findUnique({ where: { id: 'default' }, select: { takingOrders: true, message: true } }),
  ])

  return (
    <ClientPage
      initialMeals={meals as unknown as Meal[]}
      initialPromotions={promotions}
      initialTakingOrders={storeSettings?.takingOrders ?? null}
      initialStoreMessage={storeSettings?.message ?? ''}
    />
  )
}
