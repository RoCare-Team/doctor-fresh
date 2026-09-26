import { listReviews, reviewableProducts } from '@/lib/sql/admin-reviews';
import ReviewsManager from '@/components/admin/ReviewsManager';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reviews' };

/** What customers say under each product — and what the star rating is built from. */
export default async function AdminReviewsPage() {
  await requirePage('reviews');

  const [reviews, products] = await Promise.all([
    listReviews().catch(() => null),
    reviewableProducts().catch(() => []),
  ]);

  return <ReviewsManager reviews={reviews || []} products={products || []} />;
}
