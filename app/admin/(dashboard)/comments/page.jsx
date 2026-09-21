import { listComments } from '@/lib/sql/admin-comments';
import CommentsManager from '@/components/admin/CommentsManager';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comments' };

/** What visitors write under the blog posts and in each service page's Community Chat. */
export default async function AdminCommentsPage() {
  const admin = await requirePage('comments');
  const comments = (await listComments().catch(() => null)) || [];
  return <CommentsManager comments={comments} adminName={admin?.name || ''} />;
}
