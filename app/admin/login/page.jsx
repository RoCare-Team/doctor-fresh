import { redirect } from 'next/navigation';
import Image from 'next/image';
import AdminLogin from '@/components/admin/AdminLogin';
import { getAdminSession } from '@/lib/admin/session';
import { getBrand } from '@/lib/catalog';
import { imageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin sign in',
  icons: { icon: '/images/favicon.png', apple: '/images/favicon.png' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage() {
  // Already signed in — no reason to show the form again.
  if (await getAdminSession()) redirect('/admin');

  const brand = await getBrand();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* the artwork is opaque white, so it gets its own plate rather than
              sitting as a rectangle on the grey backdrop */}
          <span className="inline-flex rounded-xl bg-white px-4 py-3">
            <Image
              src={imageUrl(brand.logo)}
              alt={brand.name}
              width={878}
              height={188}
              priority
              className="h-8 w-auto"
            />
          </span>
          <p className="text-[13.5px] font-medium uppercase tracking-wide text-ink-400">Admin</p>
        </div>
        <AdminLogin />
      </div>
    </div>
  );
}
