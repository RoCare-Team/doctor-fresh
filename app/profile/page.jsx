import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, Heart, ShoppingCart, CircleUser } from 'lucide-react';
import ProfileForm from '@/components/account/ProfileForm';
import ProductGrid from '@/components/products/ProductGrid';
import Button from '@/components/common/Button';
import CartSummaryCard from '@/components/account/CartSummaryCard';
import { getSession } from '@/lib/auth/session';
import { getProfile, getOrdersForUser, getWishlistIds } from '@/lib/sql/account';
import { getProductsByIds } from '@/lib/catalog';
import { formatPrice, formatDate, metaFor } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = metaFor({
  title: 'My account',
  description: 'Your Doctor Fresh profile, orders and saved products.',
  path: '/profile',
  robots: { index: false, follow: false },
});

const DELIVERY_LABEL = {
  pending: 'Being processed',
  processing: 'Being processed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  'order cancelled': 'Cancelled',
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [profile, orders, wishlistIds] = await Promise.all([
    getProfile(session.id),
    getOrdersForUser(session.id),
    getWishlistIds(session.id),
  ]);
  if (!profile) redirect('/login');

  const wishlist = wishlistIds.length ? await getProductsByIds(wishlistIds) : [];
  const spent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="df-container py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="df-eyebrow">My account</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            {profile.name || `+91 ${profile.mobile}`}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-400">
            +91 {profile.mobile}
            {profile.email ? ` · ${profile.email}` : ''}
            {profile.memberSince ? ` · member since ${formatDate(profile.memberSince)}` : ''}
          </p>
        </div>
        <Button href="/all-category" variant="outline">Continue shopping</Button>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Stat icon={Package} label="Orders" value={orders.length} />
        <Stat icon={ShoppingCart} label="Total ordered" value={formatPrice(spent)} />
        <Stat icon={Heart} label="Saved products" value={wishlist.length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="space-y-10">
          {/* ------------------------------------------------------- orders */}
          <section>
            <h2 className="mb-4 text-[19px] font-semibold text-ink-900 md:text-[22px]">Your orders</h2>

            {orders.length ? (
              <ul className="space-y-3">
                {orders.map((order) => (
                  <li key={order.id} className="df-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-medium text-ink-900">{order.code}</p>
                        <p className="mt-0.5 text-[13.5px] text-ink-400">
                          {formatDate(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-semibold text-ink-900">{formatPrice(order.total)}</p>
                        <p className="mt-0.5 text-[13px] text-ink-400">
                          {order.paid ? 'Paid' : 'Cash on delivery'}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[14px] text-ink-500">
                      {order.items.slice(0, 3).map((i, index) => (
                        <li key={`${order.id}-${i.id}-${index}`} className="flex justify-between gap-4">
                          <span className="line-clamp-1">{i.name}</span>
                          <span className="shrink-0 text-ink-400">× {i.qty}</span>
                        </li>
                      ))}
                      {order.items.length > 3 ? (
                        <li className="text-ink-400">and {order.items.length - 3} more</li>
                      ) : null}
                    </ul>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[12.5px] font-medium text-primary-800">
                        {DELIVERY_LABEL[order.delivery] || order.delivery}
                      </span>
                      <Link
                        href={`/order/${order.id}`}
                        className="text-[14px] font-medium text-primary-700 transition-colors hover:text-primary-800"
                      >
                        View details
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-12 text-center">
                <p className="text-[15px] text-ink-500">You have not placed an order yet.</p>
                <Button href="/all-category" className="mt-4">Browse products</Button>
              </div>
            )}
          </section>

          {/* ----------------------------------------------------- wishlist */}
          {wishlist.length ? (
            <section>
              <h2 className="mb-4 text-[19px] font-semibold text-ink-900 md:text-[22px]">Saved products</h2>
              <ProductGrid products={wishlist} />
            </section>
          ) : null}

          {/* ------------------------------------------------------ details */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[19px] font-semibold text-ink-900 md:text-[22px]">
              <CircleUser size={20} className="text-primary-700" aria-hidden="true" />
              Your details
            </h2>
            <ProfileForm profile={profile} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-34.5 lg:self-start">
          <CartSummaryCard />
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="df-card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[13px] text-ink-400">{label}</span>
        <span className="block text-[17px] font-semibold text-ink-900">{value}</span>
      </span>
    </div>
  );
}
