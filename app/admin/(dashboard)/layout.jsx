import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/session';
import AdminShell from '@/components/admin/AdminShell';
import { getBrand } from '@/lib/catalog';

// The admin area reads live data on every request and must never be indexed.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: { default: 'Admin', template: '%s · Doctor Fresh admin' },
  icons: { icon: '/images/favicon.png', apple: '/images/favicon.png' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const admin = await getAdminSession();

  // The sign-in page lives outside this group, so this redirect cannot loop.
  if (!admin) redirect('/admin/login');

  // The mark is the same one the storefront reads, so a logo change lands here too.
  const brand = await getBrand().catch(() => null);

  return <AdminShell admin={admin} brand={brand}>{children}</AdminShell>;
}
