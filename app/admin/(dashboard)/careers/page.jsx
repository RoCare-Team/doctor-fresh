import {
  listJobs, listApplications, JOB_TYPES, APPLICATION_STAGES,
} from '@/lib/sql/careers';
import CareersManager from '@/components/admin/CareersManager';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Careers' };

/** The openings on /careers and the applications sent for them. */
export default async function AdminCareersPage() {
  await requirePage('careers');
  const [jobs, applications] = await Promise.all([
    listJobs().catch(() => null),
    listApplications().catch(() => null),
  ]);
  return (
    <CareersManager
      jobs={jobs || []}
      applications={applications || []}
      jobTypes={JOB_TYPES}
      stages={APPLICATION_STAGES}
    />
  );
}
