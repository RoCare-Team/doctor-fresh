/**
 * The look of the pages the mobile app opens in the phone's browser (the app
 * privacy policy and account deletion): a narrow, app-like column — a pill
 * label, a heading with an accent, fact chips, then white cards with an icon
 * each. Server components only; the wording is passed in unchanged.
 */

export function AppPage({ children }) {
  return (
    <div className="bg-surface-muted">
      <div className="mx-auto max-w-xl px-4 pb-14 pt-6 md:pt-10">{children}</div>
    </div>
  );
}

/** Pill label, heading (with an accent part), intro and chips. */
export function AppHero({ label, title, accent, after = '', intro, meta, chips = [] }) {
  return (
    <header className="mb-5">
      <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-primary-700">
        {label}
      </span>
      <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-tight text-ink-900">
        {title} <span className="text-primary-600">{accent}</span>
        {after}
      </h1>
      {meta ? <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{meta}</p> : null}
      {intro ? <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-500">{intro}</div> : null}
      {chips.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary-600" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {c}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

// Text inside a card: spacing for paragraphs, lists, tables and links.
const COPY = [
  'text-[14.5px] leading-relaxed text-ink-500',
  '[&_p]:mt-2 [&_p:first-child]:mt-0',
  '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
  '[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_strong]:font-semibold [&_strong]:text-ink-900',
  '[&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-[14.5px] [&_h3]:font-semibold [&_h3]:text-ink-900',
  '[&_a]:font-medium [&_a]:text-primary-700 [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:text-[13px]',
].join(' ');

/** One section as a white card: an icon tile, a heading, then the text. */
export function AppCard({ icon, title, children, id }) {
  return (
    <section id={id} className="mb-3 rounded-2xl border border-line bg-white p-4 md:p-5">
      {title ? (
        <div className="mb-2 flex items-center gap-3">
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">{icon}</span>
          ) : null}
          <h2 className="text-[16.5px] font-semibold leading-snug text-ink-900">{title}</h2>
        </div>
      ) : null}
      <div className={COPY}>{children}</div>
    </section>
  );
}

/** A full-width button, filled or outlined. */
export function AppButton({ href, children, outline = false }) {
  return (
    <a
      href={href}
      className={
        outline
          ? 'flex h-12 w-full items-center justify-center rounded-xl border border-primary-600 bg-white text-[15px] font-semibold !text-primary-700 !no-underline'
          : 'flex h-12 w-full items-center justify-center rounded-xl bg-primary-700 text-[15px] font-semibold !text-white !no-underline'
      }
    >
      {children}
    </a>
  );
}

/* Small line icons (24px grid, current colour). */
const Svg = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const Icons = {
  user: <Svg d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />,
  phone: <Svg d={<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />} />,
  location: <Svg d={<><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>} />,
  card: <Svg d={<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>} />,
  shield: <Svg d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />,
  share: <Svg d={<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>} />,
  clock: <Svg d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />,
  trash: <Svg d={<><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></>} />,
  check: <Svg d={<path d="M20 6 9 17l-5-5" />} />,
  list: <Svg d={<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>} />,
  lock: <Svg d={<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>} />,
  child: <Svg d={<><circle cx="12" cy="6" r="3" /><path d="M7 21v-6l-2-3 4-2h6l4 2-2 3v6" /></>} />,
  mail: <Svg d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>} />,
  edit: <Svg d={<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />} />,
  archive: <Svg d={<><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v11h14V9M10 13h4" /></>} />,
};
