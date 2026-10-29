// Shown the moment a product is clicked, while its page is fetched: the
// gallery and buy box in outline, so the click answers at once instead of
// leaving the previous page on screen.
export default function ProductLoading() {
  const bar = 'rounded-lg bg-surface-muted';
  return (
    <div className="df-container animate-pulse py-4 pb-24 md:py-6 lg:pb-10" aria-busy="true" aria-label="Loading product">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <div className="aspect-square w-full rounded-2xl bg-surface-muted" />
          <div className="mt-3 flex gap-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 w-16 rounded-xl bg-surface-muted" />)}
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <div className={`${bar} h-6 w-40`} />
          <div className={`${bar} h-8 w-full`} />
          <div className={`${bar} h-8 w-3/4`} />
          <div className={`${bar} h-5 w-28`} />
          <div className={`${bar} h-10 w-48`} />
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-5/6`} />
          <div className="flex gap-3 pt-2">
            <div className="h-12 flex-1 rounded-xl bg-surface-muted" />
            <div className="h-12 flex-1 rounded-xl bg-surface-muted" />
          </div>
          <div className="h-24 w-full rounded-2xl bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
