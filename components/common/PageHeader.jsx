import Breadcrumb from './Breadcrumb';

/**
 * Shared top block for every inner page: breadcrumb, optional eyebrow, page
 * title, optional lead paragraph and an optional right-hand slot.
 *
 * Presentation only — pages keep passing the same content they already had.
 */
export default function PageHeader({
  breadcrumb = [],
  eyebrow,
  title,
  lead,
  meta,
  actions,
  className = '',
}) {
  return (
    <header className={`border-b border-line bg-surface-muted ${className}`}>
      <div className="df-container py-6 md:py-9">
        {breadcrumb.length ? <Breadcrumb items={breadcrumb} className="mb-5" /> : null}

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-3xl">
            {eyebrow ? <p className="df-eyebrow mb-2">{eyebrow}</p> : null}
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink-900 md:text-[34px]">
              {title}
            </h1>
            {lead ? (
              <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-500">{lead}</p>
            ) : null}
            {meta ? <div className="mt-4">{meta}</div> : null}
          </div>

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
