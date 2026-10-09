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
    <ul className="grid grid-cols-3 gap-y-2 rounded-2xl border border-primary-100 bg-primary-50/70 py-4 sm:grid-cols-5">
      {features.map((f) => {
        const Icon = ICONS[f.id] || ShieldCheck;
        return (
          <li
            key={f.id}
            title={f.note}
            className="flex flex-col items-center gap-2 border-primary-100 px-2 text-center sm:border-l sm:first:border-l-0"
          >
            <Icon size={26} strokeWidth={1.6} className="text-primary-600" aria-hidden="true" />
            <span className="block text-[13px] font-medium leading-tight text-ink-900">{f.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
