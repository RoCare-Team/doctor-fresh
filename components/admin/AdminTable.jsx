/** The table shell every admin list uses, so they all read the same. */
export default function AdminTable({ head, children, empty = 'Nothing here yet.', minWidth = 720 }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-left text-[14px]" style={{ minWidth }}>
        <thead className="border-b border-line bg-surface-muted text-[12.5px] uppercase tracking-wide text-ink-400">
          <tr>
            {head.map((h) => (
              <th
                key={h.label}
                className={`px-4 py-2.5 font-semibold ${h.align === 'right' ? 'text-right' : ''} ${h.hideSm ? 'hidden sm:table-cell' : ''}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {children ?? null}
          {!children || (Array.isArray(children) && !children.length) ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-12 text-center text-ink-400">{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
