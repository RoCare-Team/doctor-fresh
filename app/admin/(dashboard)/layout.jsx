import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/session';
import AdminShell from '@/components/admin/AdminShell';

// The admin area reads live data on every request and must never be indexed.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: { default: 'Admin', template: '%s · Doctor Fresh admin' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const admin = await getAdminSession();

  // The sign-in page lives outside this group, so this redirect cannot loop.
  if (!admin) redirect('/admin/login');

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
