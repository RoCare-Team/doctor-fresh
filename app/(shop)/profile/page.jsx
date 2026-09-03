import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Wallet, Package, Heart, Mail, Phone, MapPin, Download,
} from 'lucide-react';
import ProfileForm from '@/components/account/ProfileForm';
import AccountNav, { ACCOUNT_TABS } from '@/components/account/AccountNav';
import WishlistTable from '@/components/account/WishlistTable';
import OrderTrace from '@/components/account/OrderTrace';
import Button from '@/components/common/Button';
import { getSession } from '@/lib/auth/session';
import { getProfile, getOrdersForUser, getWishlistIds } from '@/lib/sql/account';
import { getProductsByIds, cardProduct } from '@/lib/catalog';
import { formatPrice, formatDate, metaFor, cx } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = metaFor({
  title: 'My profile',
  description: 'Your Doctor Fresh profile, orders and saved products.',
  path: '/profile',
  robots: { index: false, follow: false },
});

const DELIVERY = {
  pending: { label: 'Being processed', tone: 'wait' },
  processing: { label: 'Being processed', tone: 'wait' },
  shipped: { label: 'Shipped', tone: 'go' },
  delivered: { label: 'Delivered', tone: 'done' },
  'order cancelled': { label: 'Cancelled', tone: 'off' },
};

const DAY = 24 * 60 * 60 * 1000;

/** What the current site calls the purchase summary. */
function purchaseSummary(orders) {
  const now = Date.now();
  const since = (days) => orders
    .filter((o) => o.placedAt && now - new Date(o.placedAt).getTime() <= days * DAY)
    .reduce((sum, o) => sum + o.total, 0);

  return {
    total: orders.reduce((sum, o) => sum + o.total, 0),
    week: since(7),
    month: since(30),
  };
}

export default async function ProfilePage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { tab } = await searchParams;
  const active = ACCOUNT_TABS.some((t) => t.id === tab) ? tab : 'profile';

  const [profile, orders, wishlistIds] = await Promise.all([
    getProfile(session.id),
    getOrdersForUser(session.id),
    getWishlistIds(session.id),
  ]);
  if (!profile) redirect('/login');

  // Only the wishlist panel renders products, and the catalogue read is not
  // free — the other panels skip it and only need the count.
  const wishlist = active === 'wishlist' && wishlistIds.length
    ? (await getProductsByIds(wishlistIds)).map(cardProduct)
    : [];

  return (
    <div className="bg-surface-muted">
      <div className="df-container py-8 md:py-11">
        <div className="grid gap-6 lg:grid-cols-[268px_minmax(0,1fr)] lg:gap-8">
          <AccountNav
            active={active}
            profile={profile}
            counts={{ orders: orders.length, wishlist: wishlistIds.length }}
          />

          <div className="min-w-0">
            {active === 'profile' ? (
              <ProfilePanel profile={profile} orders={orders} savedCount={wishlistIds.length} />
            ) : null}

            {active === 'orders' ? <OrdersPanel orders={orders} /> : null}

            {active === 'wishlist' ? (
              <Panel title="Your wishlist" note={`${wishlistIds.length} saved`}>
                <WishlistTable products={wishlist} />
              </Panel>
            ) : null}

            {active === 'edit' ? (
              <Panel title="Edit profile" note="Used for delivery and invoices">
                <div className="df-card p-5 md:p-6">
                  <ProfileForm profile={profile} />
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panels */

function Panel({ title, note, children }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[21px] font-semibold tracking-tight text-ink-900 md:text-[25px]">
          {title}
        </h1>
        {note ? <p className="text-[13.5px] text-ink-400">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ProfilePanel({ profile, orders, savedCount }) {
  const spent = purchaseSummary(orders);
  const address = [profile.address1, profile.address2, profile.city, profile.state, profile.zip]
    .filter(Boolean).join(', ');

  return (
    <Panel title="Profile" note={profile.memberSince ? `Member since ${formatDate(profile.memberSince)}` : null}>
      {/* The three figures a customer opens this page to see. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Wallet} label="Total purchase" value={formatPrice(spent.total)} accent />
        <Metric icon={Package} label="Orders placed" value={String(orders.length)} />
        <Metric icon={Heart} label="Saved products" value={String(savedCount)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Contact details" action={{ href: '/profile?tab=edit', label: 'Edit' }}>
          <Detail icon={Mail} label="Email" value={profile.email} />
          <Detail icon={Phone} label="Contact no" value={profile.mobile ? `+91 ${profile.mobile}` : ''} />
          <Detail icon={MapPin} label="Address" value={address} />
          <Detail icon={MapPin} label="Country" value={profile.country} last />
        </Card>

        <div className="grid gap-4">
          <Card title="Purchase summary">
            <Row label="Last 7 days" value={formatPrice(spent.week)} />
            <Row label="Last 30 days" value={formatPrice(spent.month)} />
            <Row label="All time" value={formatPrice(spent.total)} strong last />
          </Card>

          <Card title="Account">
            <Row
              label="Member since"
              value={profile.memberSince ? formatDate(profile.memberSince) : '—'}
            />
            <Row
              label="Last login"
              value={profile.lastLogin ? formatDate(profile.lastLogin) : '—'}
              last
            />
          </Card>
        </div>
      </div>

      {orders.length ? (
        <div className="mt-5">
          <Card
            title="Recent orders"
            action={{ href: '/profile?tab=orders', label: 'View all' }}
          >
            {orders.slice(0, 3).map((order, i, shown) => (
              <div
                key={order.id}
                className={cx(
                  'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                  i < shown.length - 1 && 'border-b border-line',
                )}
              >
                <div className="min-w-0">
                  <Link
                    href={`/order/${order.id}`}
                    className="text-[14.5px] font-medium text-ink-900 hover:text-primary-700"
                  >
                    {order.code}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-ink-400">
                    {formatDate(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Pill {...(DELIVERY[order.delivery] || { label: order.delivery, tone: 'wait' })} />
                  <span className="text-[14.5px] font-semibold text-ink-900">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ) : (
        <div className="mt-5">
          <Empty
            title="No orders yet"
            body="Everything you buy will show here, with its invoice."
          />
        </div>
      )}
    </Panel>
  );
}

function OrdersPanel({ orders }) {
  if (!orders.length) {
    return (
      <Panel title="Order history">
        <Empty title="No orders yet" body="Everything you buy will show here, with its invoice." />
      </Panel>
    );
  }

  return (
    <Panel title="Order history" note={`${orders.length} order${orders.length === 1 ? '' : 's'}`}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_252px]">
        <ul className="space-y-3">
          {orders.map((order) => {
            const status = DELIVERY[order.delivery] || { label: order.delivery, tone: 'wait' };

            return (
              <li key={order.id} className="df-card df-card-hover overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[14.5px] font-semibold text-ink-900">{order.code}</span>
                    <span className="text-[13px] text-ink-400">{formatDate(order.placedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill {...status} />
                    <Pill label={order.paid ? 'Paid' : 'Payment due'} tone={order.paid ? 'done' : 'off'} />
                  </div>
                </div>

                <div className="px-4 py-3">
                  <ul className="space-y-1.5">
                    {order.items.slice(0, 3).map((item, index) => (
                      <li
                        key={`${order.id}-${item.id}-${index}`}
                        className="flex items-baseline justify-between gap-4 text-[14px]"
                      >
                        <span className="line-clamp-1 text-ink-700">{item.name}</span>
                        <span className="shrink-0 text-ink-400">× {item.qty}</span>
                      </li>
                    ))}
                    {order.items.length > 3 ? (
                      <li className="text-[13.5px] text-ink-400">
                        and {order.items.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <span>
                    <span className="block text-[12.5px] text-ink-400">Order total</span>
                    <span className="block text-[17px] font-semibold text-ink-900">
                      {formatPrice(order.total)}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-2">
                    {/* A plain link, so the browser downloads it rather than
                        the page having to hold the file in memory. */}
                    <a
                      href={`/api/orders/invoice/${order.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-[13.5px] font-medium text-primary-800 transition-colors hover:border-primary-300 hover:bg-primary-100"
                    >
                      <Download size={15} aria-hidden="true" />
                      Invoice
                    </a>
                    <Link
                      href={`/order/${order.id}`}
                      className="inline-flex h-9 items-center rounded-lg bg-primary-500 px-3.5 text-[13.5px] font-medium text-white transition-colors hover:bg-ink-900"
                    >
                      View order
                    </Link>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="xl:sticky xl:top-34.5 xl:self-start">
          <OrderTrace orders={orders} />
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ small pieces */

function Metric({ icon: Icon, label, value, accent = false }) {
  return (
    <div
      className={cx(
        'df-card flex items-center gap-3 p-4',
        accent && 'bg-linear-to-br from-primary-50 to-white',
      )}
    >
      <span
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          accent ? 'bg-primary-500 text-white' : 'bg-surface-muted text-primary-700',
        )}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink-400">{label}</span>
        <span className="block truncate text-[19px] font-semibold tracking-tight text-ink-900">
          {value}
        </span>
      </span>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div className="df-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
        {action ? (
          <Link
            href={action.href}
            className="text-[13.5px] font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, value, last = false }) {
  return (
    <div className={cx('flex items-start gap-3 px-4 py-3', !last && 'border-b border-line')}>
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-300" />
      <span className="min-w-0">
        <span className="block text-[12.5px] text-ink-400">{label}</span>
        <span className="block text-[14.5px] text-ink-900">
          {value || <span className="text-ink-300">Not added</span>}
        </span>
      </span>
    </div>
  );
}

function Row({ label, value, strong = false, last = false }) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-4 px-4 py-2.5',
        !last && 'border-b border-line',
      )}
    >
      <span className="text-[14px] text-ink-500">{label}</span>
      <span
        className={cx(
          'font-semibold text-ink-900',
          strong ? 'text-[17px] text-primary-700' : 'text-[14.5px]',
        )}
      >
        {value}
      </span>
    </div>
  );
}

const TONE = {
  done: 'bg-success/10 text-success',
  go: 'bg-primary-50 text-primary-800',
  wait: 'bg-surface-muted text-ink-500',
  off: 'bg-danger/10 text-danger',
};

function Pill({ label, tone = 'wait' }) {
  return (
    <span className={cx('rounded-full px-2.5 py-1 text-[12.5px] font-medium', TONE[tone] || TONE.wait)}>
      {label}
    </span>
  );
}

function Empty({ title, body }) {
  return (
    <div className="df-card px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary-700">
        <Package size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[16px] font-semibold text-ink-900">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-400">{body}</p>
      <Button href="/all-category" className="mt-5">Browse products</Button>
    </div>
  );
}
