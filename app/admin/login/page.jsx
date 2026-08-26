import { redirect } from 'next/navigation';
import AdminLogin from '@/components/admin/AdminLogin';
import { getAdminSession } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage() {
  // Already signed in — no reason to show the form again.
  if (await getAdminSession()) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-[15px] font-semibold text-ink-900">
          Doctor Fresh <span className="text-ink-400">admin</span>
        </p>
        <AdminLogin />
      </div>
    </div>
  );
}
