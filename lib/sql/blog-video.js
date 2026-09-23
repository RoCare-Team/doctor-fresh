// A video for a blog post — a YouTube / Vimeo link or an uploaded file.
//
// The PHP site's `blog` table has no column for it, and that table is shared
// with the live PHP panel, so the link lives beside it in `df_blog_video`
// (created on first use) rather than altering the shared table.

import { queryOne, mutate } from '@/lib/db';
import { videoSource } from '@/components/common/VideoEmbed';

const TABLE = 'df_blog_video';
const store = globalThis;

async function ensureTable() {
  if (store.__dfBlogVideo) return true;
  try {
    await mutate(
      `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
        \`blog_id\` INT NOT NULL PRIMARY KEY,
        \`video_url\` VARCHAR(1000) NOT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    store.__dfBlogVideo = true;
    return true;
  } catch (err) {
    console.error('[blog-video] table unavailable:', err.code || err.message);
    return false;
  }
}

/** The post's video link, or '' when it has none. */
export async function getBlogVideo(id) {
  try {
    if (!(await ensureTable())) return '';
    const row = await queryOne(`SELECT \`video_url\` FROM \`${TABLE}\` WHERE \`blog_id\` = ? LIMIT 1`, [Number(id) || 0]);
    return row?.video_url || '';
  } catch (err) {
    console.error('[blog-video] could not read:', err.message);
    return '';
  }
}

/** Drops the post's video row, when the post itself is deleted. */
export async function removeBlogVideo(id) {
  if (!(await ensureTable())) return { ok: true };
  await mutate(`DELETE FROM \`${TABLE}\` WHERE \`blog_id\` = ?`, [Number(id) || 0]);
  return { ok: true };
}

/** Saves the link; an empty one removes the video. */
export async function setBlogVideo(id, url) {
  const link = String(url ?? '').trim().slice(0, 1000);
  if (link && !videoSource(link)) return { error: 'Paste a YouTube or Vimeo link, or upload a video file.' };
  if (!(await ensureTable())) return { error: 'The video table is not available.' };
  if (!link) {
    await mutate(`DELETE FROM \`${TABLE}\` WHERE \`blog_id\` = ?`, [id]);
  } else {
    await mutate(
      `INSERT INTO \`${TABLE}\` (\`blog_id\`, \`video_url\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`video_url\` = VALUES(\`video_url\`)`,
      [id, link],
    );
  }
  return { ok: true };
}
