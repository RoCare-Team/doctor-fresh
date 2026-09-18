import { requirePage } from '@/lib/admin/guard';
import { listAdminUsers } from '@/lib/sql/admin-users';
import AdminUsers from '@/components/admin/AdminUsers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin users' };

export default async function AdminUsersPage() {
  const me = await requirePage('users');
  const users = (await listAdminUsers()) || [];
  return <AdminUsers users={users} meId={me.id} />;
}
