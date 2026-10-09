/**
 * One video from a link an admin pasted or a file they uploaded: YouTube and
 * Vimeo links become their players, anything else (an uploaded .mp4/.webm)
 * plays in a <video>. Unknown or unsafe links render nothing.
 */
export function videoSource(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;

  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host.endsWith('youtube.com')) {
    id = u.searchParams.get('v') || (u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1] || '';
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };

  if (host.endsWith('vimeo.com')) {
    const vid = (u.pathname.match(/(\d{6,})/) || [])[1];
    if (vid) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vid}` };
  }
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u.pathname)) return { kind: 'file', src: u.toString() };
  return null;
}

export default function VideoEmbed({ url, title = 'Video', className = '', autoPlay = false }) {
  const source = videoSource(url);
  if (!source) return null;
  // Only after a click, so the browser lets it start with sound.
  const src = autoPlay && source.kind === 'iframe' ? `${source.src}?autoplay=1&rel=0` : source.src;

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-ink-900 ${className}`}>
      {source.kind === 'iframe' ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={src} controls playsInline autoPlay={autoPlay} preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
      )}
    </div>
  );
}
