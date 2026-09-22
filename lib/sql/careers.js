// Careers: job openings and the applications sent for them.
//
// Both live in the PHP site's own tables, so either admin sees the same data:
//   job_category — an opening (title, location, type, experience, how many
//                  posts in `requirement`, description; status '1' = open)
//   job_apply    — an application (name, email, phone, city, message, the
//                  résumé's address; job_cat_id 0 = a general application)

import { query, queryOne, mutate } from '@/lib/db';

const clean = (v, max = 255) => String(v ?? '').trim().replace(/[ \t]+/g, ' ').slice(0, max);
const text = (v, max = 20_000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const time = (v) => (v ? new Date(v).getTime() : null);

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 200);

export const JOB_TYPES = ['Full time', 'Part time', 'Contract', 'Internship', 'Freelance'];

export const APPLICATION_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
];
const STAGE_IDS = new Set(APPLICATION_STAGES.map((s) => s.id));

/* ---------------------------------------------------------------- openings */

const isOpen = (status) => String(status ?? '1') === '1' || String(status).toLowerCase() === 'active';

function mapJob(r) {
  return {
    id: r.job_category_id,
    title: r.title || '',
    slug: r.slug_url || '',
    description: r.description || '',
    positions: num(r.requirement),
    jobType: r.job_type || '',
    experience: r.experience || '',
    location: r.location || '',
    open: isOpen(r.status),
    views: num(r.number_of_view),
    createdAt: time(r.created_at),
  };
}

export async function listJobs({ openOnly = false } = {}) {
  const rows = await query('SELECT * FROM `job_category` ORDER BY `job_category_id` DESC');
  if (rows === null) return null;
  const jobs = rows.map(mapJob);
  return openOnly ? jobs.filter((j) => j.open) : jobs;
}

/** Adds (no id) or updates an opening. */
export async function saveJob(input) {
  const title = clean(input.title, 255);
  if (!title) return { error: 'Enter the job title.' };
  const values = {
    title,
    slug_url: slugify(title),
    description: text(input.description),
    requirement: Math.max(0, Math.min(999, Math.round(num(input.positions)))),
    job_type: clean(input.jobType, 50),
    experience: clean(input.experience, 50),
    location: clean(input.location, 50),
    status: input.open === false ? '0' : '1',
  };

  const id = num(input.id);
  if (id) {
    const exists = await queryOne('SELECT `job_category_id` FROM `job_category` WHERE `job_category_id` = ? LIMIT 1', [id]);
    if (!exists) return { error: 'That opening no longer exists.' };
    await mutate(
      `UPDATE \`job_category\` SET ${Object.keys(values).map((k) => `\`${k}\` = ?`).join(', ')}, \`updated_at\` = NOW()
        WHERE \`job_category_id\` = ?`,
      [...Object.values(values), id],
    );
    return { ok: true, id };
  }
  const result = await mutate(
    `INSERT INTO \`job_category\` (${Object.keys(values).map((k) => `\`${k}\``).join(', ')}, \`number_of_view\`, \`created_at\`, \`updated_at\`)
     VALUES (${Object.keys(values).map(() => '?').join(', ')}, 0, NOW(), NOW())`,
    Object.values(values),
  );
  return { ok: true, id: result.insertId };
}

export async function setJobOpen(id, open) {
  await mutate('UPDATE `job_category` SET `status` = ?, `updated_at` = NOW() WHERE `job_category_id` = ?', [open ? '1' : '0', num(id)]);
  return { ok: true };
}

/** Deletes an opening; its applications stay, as general applications. */
export async function deleteJob(id) {
  await mutate('DELETE FROM `job_category` WHERE `job_category_id` = ?', [num(id)]);
  return { ok: true };
}

/* ------------------------------------------------------------ applications */

export async function listApplications({ limit = 2000 } = {}) {
  const rows = await query(
    `SELECT a.*, j.\`title\` AS \`job_title\`
       FROM \`job_apply\` a LEFT JOIN \`job_category\` j ON j.\`job_category_id\` = a.\`job_cat_id\`
      ORDER BY a.\`job_apply_id\` DESC LIMIT ?`,
    [Number(limit)],
  );
  if (rows === null) return null;
  return rows.map((r) => ({
    id: r.job_apply_id,
    jobId: num(r.job_cat_id),
    jobTitle: r.job_title || (num(r.job_cat_id) ? 'Opening removed' : 'General application'),
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    city: r.city || '',
    message: r.message || '',
    resume: r.resume || '',
    stage: STAGE_IDS.has(r.status) ? r.status : 'new',
    createdAt: time(r.created_at),
  }));
}

/** What a visitor sends from the careers page. */
export async function createApplication({
  jobId, name, email, phone, city, message, resume,
}) {
  const id = num(jobId);
  if (id) {
    const job = await queryOne('SELECT `job_category_id`, `status` FROM `job_category` WHERE `job_category_id` = ? LIMIT 1', [id]);
    if (!job || !isOpen(job.status)) return { error: 'This opening is no longer accepting applications.' };
  }
  const result = await mutate(
    `INSERT INTO \`job_apply\` (\`job_cat_id\`, \`name\`, \`email\`, \`phone\`, \`city\`, \`message\`, \`resume\`, \`status\`, \`created_at\`, \`updated_at\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW(), NOW())`,
    [id, clean(name), clean(email), clean(phone, 20), clean(city, 50), text(message, 5000), clean(resume, 355)],
  );
  return { ok: true, id: result.insertId };
}

export async function setApplicationStage(id, stage) {
  if (!STAGE_IDS.has(stage)) return { error: 'Unknown stage.' };
  await mutate('UPDATE `job_apply` SET `status` = ?, `updated_at` = NOW() WHERE `job_apply_id` = ?', [stage, num(id)]);
  return { ok: true };
}

export async function deleteApplication(id) {
  const row = await queryOne('SELECT `resume` FROM `job_apply` WHERE `job_apply_id` = ? LIMIT 1', [num(id)]);
  await mutate('DELETE FROM `job_apply` WHERE `job_apply_id` = ?', [num(id)]);
  return { ok: true, resume: row?.resume || '' };
}
