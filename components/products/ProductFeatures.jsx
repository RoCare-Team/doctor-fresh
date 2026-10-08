import {
  Droplets, Sun, Filter, Gauge, Sparkles, Leaf, ShieldCheck, Wrench, House,
} from 'lucide-react';
import { featureList } from '@/lib/product-tech';

/**
 * What this purifier does, as a row of marks beside the price.
 *
 * The claims come from the product's own name — "RO+UV+UF+TDS" is how the
 * catalogue records what is inside — so nothing here is decoration: each one
 * is a thing this particular machine does.
 */

const ICONS = {
  ro: Droplets,
  uv: Sun,
  uf: Filter,
  tds: Gauge,
  alkaline: Sparkles,
  copper: Leaf,
  mineral: Sparkles,
  safe: ShieldCheck,
  care: Wrench,
  home: House,
};

export default function ProductFeatures({ name }) {
  const features = featureList(name);
  if (!features.length) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-line p-2 sm:grid-cols-3 lg:grid-cols-5">
      {features.map((f) => {
        const Icon = ICONS[f.id] || ShieldCheck;
        return (
          <li key={f.id} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-primary-700">
              <Icon size={17} aria-hidden="true" />
            </span>
            <span className="block text-[12.5px] font-semibold leading-tight text-ink-900">{f.label}</span>
            <span className="block text-[11px] leading-snug text-ink-400">{f.note}</span>
          </li>
        );
      })}
    </ul>
  );
}
