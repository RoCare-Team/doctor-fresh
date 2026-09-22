import fs from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { requireAdmin, readJson, fail } from '@/lib/admin/guard';
import {
  saveJob, setJobOpen, deleteJob, setApplicationStage, deleteApplication,
} from '@/lib/sql/careers';
import { blobEnabled, removeBlobs } from '@/lib/blob';

export const dynamic = 'force-dynamic';

const refresh = () => { try { revalidatePath('/careers'); } catch { /* best-effort */ } };

/** { job: {...} } adds or updates an opening. */
export async function POST(request) {
  const body = await readJson(request);
  if (!body?.job) return fail('Invalid request.');
  const { response } = await requireAdmin('careers', body.job.id ? 'edit' : 'create');
  if (response) return response;
  try {
    const saved = await saveJob(body.job);
    if (saved.error) return fail(saved.error);
    refresh();
    return Response.json({ ok: true, id: saved.id });
  } catch (err) {
    console.error('[admin] could not save the opening:', err.message);
    return fail('Could not save the opening.', 502);
  }
}

/** { jobId, open } opens / closes an opening; { applicationId, stage } moves an application. */
export async function PATCH(request) {
  const { response } = await requireAdmin('careers', 'edit');
  if (response) return response;
  const body = await readJson(request);
  if (!body) return fail('Invalid request.');
  try {
    if (body.jobId) {
      await setJobOpen(body.jobId, Boolean(body.open));
      refresh();
      return Response.json({ ok: true });
    }
    if (body.applicationId) {
      const result = await setApplicationStage(body.applicationId, body.stage);
      if (result.error) return fail(result.error);
      return Response.json({ ok: true });
    }
    return fail('Invalid request.');
  } catch (err) {
    console.error('[admin] could not update careers:', err.message);
    return fail('Could not save the change.', 502);
  }
}

/** ?job=id or ?application=id (the CV file goes with it). */
export async function DELETE(request) {
  const { response } = await requireAdmin('careers', 'delete');
  if (response) return response;
  const url = new URL(request.url);
  try {
    const jobId = Number(url.searchParams.get('job')) || 0;
    if (jobId) {
      await deleteJob(jobId);
      refresh();
      return Response.json({ ok: true });
    }
    const appId = Number(url.searchParams.get('application')) || 0;
    if (!appId) return fail('Invalid request.');
    const { resume } = await deleteApplication(appId);
    if (resume) {
      if (/^https?:\/\//.test(resume)) {
        if (blobEnabled()) await removeBlobs([resume]).catch(() => {});
      } else if (resume.startsWith('/uploads/resume/')) {
        await fs.unlink(path.join(process.cwd(), 'public', resume)).catch(() => {});
      }
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[admin] could not delete:', err.message);
    return fail('Could not delete.', 502);
  }
}
