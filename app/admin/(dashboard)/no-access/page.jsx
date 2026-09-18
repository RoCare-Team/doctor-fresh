import Link from 'next/link';
import { Lock } from 'lucide-react';
import { getAdminSession } from '@/lib/admin/session';
import { SECTIONS, homeFor, roleInfo } from '@/lib/admin/access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'No access' };

/** Where a page guard sends someone whose role does not include that section. */
export default async function NoAccessPage({ searchParams }) {
  const params = await searchParams;
  const admin = await getAdminSession();
  const section = SECTIONS.find((s) => s.id === params?.section);
  const home = admin ? homeFor(admin.access) : null;
  const role = roleInfo(admin?.access?.role)?.label || 'Custom';

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-white p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/12 text-warning">
        <Lock size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[20px] font-semibold text-ink-900">No access</h1>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">
        {`Your role (${role}) does not include ${section ? section.label : 'this section'}. Ask an owner to give you access in Admin users.`}
      </p>
      {home ? (
        <Link href={home} className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-primary-700">
          Go to your first section
        </Link>
      ) : null}
    </div>
  );
}
