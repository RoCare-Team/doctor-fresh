import { Search } from 'lucide-react';

/** A plain GET form so a filtered list stays shareable and server-rendered. */
export default function SearchBox({ action, placeholder = 'Search', defaultValue = '', hidden = {} }) {
  return (
    <form action={action} className="relative">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500 sm:w-64"
      />
    </form>
  );
}
