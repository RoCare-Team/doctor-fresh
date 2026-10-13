// GET /api/mobile/page?type=legal&slug=<slug> — a policy page { title, html }
// GET /api/mobile/page?type=stores            — store locator branches
// GET /api/mobile/page?type=careers           — careers intro and open jobs
//
// Read-only.

import { getLegalPage } from '@/lib/catalog';
import { listLocations } from '@/lib/sql/locations';
import { listJobs } from '@/lib/sql/careers';
import { getContent } from '@/lib/sql/site-content';
import { stores, careers } from '@/data/site';
import { fail, ok, unavailable } from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const type = params.get('type');

  try {
    if (type === 'legal') {
      const page = await getLegalPage(params.get('slug') || '');
      if (!page) return fail('Page not found.', 404);
      return ok({ title: page.heading || page.title, html: page.html || '' });
    }

    if (type === 'stores') {
      const fromDb = await listLocations({ activeOnly: true }).catch(() => null);
      const locations = (fromDb ?? stores.map((s) => ({
        city: s.city, branch: `Doctor Fresh ${s.city}`, address: s.address, time: s.hours, mapLink: '', phone: '',
      }))).map((l) => ({
        city: l.city || '',
        branch: l.branch || '',
        address: l.address || '',
        time: l.time || '',
        phone: l.phone || '',
        mapLink: l.mapLink || '',
      }));
      return ok({ locations });
    }

    if (type === 'careers') {
      const [c, jobs] = await Promise.all([
        getContent('pages').catch(() => ({})),
        listJobs({ openOnly: true }).catch(() => []),
      ]);
      return ok({
        title: c?.careersTitle || careers.title,
        intro: c?.careersIntro || careers.intro,
        jobs: jobs || [],
      });
    }

    return fail('Unknown page type.');
  } catch (err) {
    return unavailable(err, 'page');
  }
}
