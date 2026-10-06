import { listActivity, activityAdmins } from '@/lib/sql/activity';
import { SECTIONS } from '@/lib/admin/access';
import { requirePage } from '@/lib/admin/guard';
import ActivityLog from '@/components/admin/ActivityLog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Activity log' };

/** Who changed what in the admin, newest first. */
export default async function AdminActivityPage({ searchParams }) {
  await requirePage('activity');
  const params = (await searchParams) || {};

  const section = String(params.section || '');
  const adminId = Number(params.who || 0);
  const search = String(params.q || '').trim();

  const [rows, admins] = await Promise.all([
    listActivity({ section, adminId, search, limit: 300 }).catch(() => []),
    activityAdmins().catch(() => []),
  ]);

  return (
    <ActivityLog
      rows={rows}
      admins={admins}
      sections={SECTIONS.filter((s) => s.id !== 'activity' && s.id !== 'dashboard')}
      filters={{ section, who: adminId, q: search }}
    />
  );
}
