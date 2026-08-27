/**
 * The "nothing here" panel — an empty carton, a line saying why, and a way out.
 *
 * A blank gap where the results should be reads as a broken page. This says the
 * filters matched nothing, which is a different thing from the category being
 * empty, and always offers the action that undoes it.
 */
export default function EmptyState({
  title = 'No products found',
  message,
  children,
  className = '',
}) {
  return (
    <div
      className={`rounded-[14px] border border-dashed border-line-strong bg-surface-muted px-6 py-12 text-center ${className}`}
    >
      <EmptyBox />

      <h2 className="mt-5 text-[17px] font-semibold text-ink-900">{title}</h2>
      {message ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-500">{message}</p>
      ) : null}

      {children ? <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}

/** An open, empty carton drawn inline so it costs no request and follows the theme. */
function EmptyBox() {
  return (
    <svg
      viewBox="0 0 160 128"
      width="150"
      height="120"
      role="img"
      aria-label="An empty box"
      className="mx-auto"
    >
      {/* what it is resting on */}
      <ellipse cx="80" cy="116" rx="44" ry="6" className="fill-line" />

      {/* the opening, darker so the box reads as hollow */}
      <polygon points="80,44 128,62 80,80 32,62" className="fill-primary-200" />

      {/* the two front faces */}
      <path d="M32 62 L80 80 L80 112 L32 94 Z" className="fill-primary-100" />
      <path d="M128 62 L80 80 L80 112 L128 94 Z" className="fill-surface-tint" />

      {/* flaps, folded open */}
      <path d="M32 62 L80 44 L58 29 L11 47 Z" className="fill-primary-100" />
      <path d="M128 62 L80 44 L102 29 L149 47 Z" className="fill-surface-tint" />

      <g className="stroke-primary-300" strokeWidth="2" fill="none" strokeLinejoin="round">
        <polygon points="80,44 128,62 80,80 32,62" />
        <path d="M32 62 L80 80 L80 112 L32 94 Z" />
        <path d="M128 62 L80 80 L80 112 L128 94 Z" />
        <path d="M32 62 L80 44 L58 29 L11 47 Z" />
        <path d="M128 62 L80 44 L102 29 L149 47 Z" />
      </g>

      {/* nothing came out of it */}
      <g className="fill-primary-300">
        <circle cx="52" cy="18" r="3" />
        <circle cx="80" cy="10" r="2" />
        <circle cx="108" cy="19" r="2.5" />
      </g>
    </svg>
  );
}
