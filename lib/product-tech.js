// What a purifier actually does, read from its own name.
//
// The catalogue has no field for this: the technology is written into the
// title the way the trade writes it — "RO+UV+UF+TDS Infuser+ME+AS+Alkaline".
// So the title is where it is read from, and nothing is invented: a product
// whose name says nothing gets the general lines every purifier can claim.

const TECH = [
  {
    id: 'ro',
    match: /\bRO\b/i,
    label: 'RO Purification',
    note: 'Removes dissolved salts & heavy metals',
    step: { title: 'RO Membrane', note: 'Pushes water through a fine membrane, leaving dissolved salts behind' },
  },
  {
    id: 'uv',
    match: /\bUV\b/i,
    label: 'UV Purification',
    note: 'Kills bacteria and viruses',
    step: { title: 'UV Purification', note: 'Ultraviolet light kills bacteria and harmful microorganisms' },
  },
  {
    id: 'uf',
    match: /\bUF\b/i,
    label: 'UF Filtration',
    note: 'Holds back visible dirt & cysts',
    step: { title: 'UF Filtration', note: 'Removes visible dirt, mud and cysts from the water' },
  },
  {
    id: 'tds',
    match: /TDS/i,
    label: 'TDS Control',
    note: 'Keeps the taste and the good minerals',
    step: { title: 'TDS Control', note: 'Balances the minerals so the water tastes right' },
  },
  {
    id: 'alkaline',
    match: /alkaline/i,
    label: 'Alkaline Water',
    note: 'Restores the natural pH balance',
    step: { title: 'Alkaline Boost', note: 'Brings the water back to its natural pH' },
  },
  {
    id: 'copper',
    match: /copper/i,
    label: 'Copper Infusion',
    note: 'Copper goodness, the traditional way',
    step: { title: 'Copper Infusion', note: 'Adds the benefits of water stored in copper' },
  },
  {
    id: 'mineral',
    match: /\bME\b|mineral/i,
    label: 'Mineral Enrichment',
    note: 'Puts the essential minerals back',
    step: { title: 'Mineral Enrichment', note: 'Returns the essential minerals the filters took out' },
  },
];

/** The technologies named in a product's title, in the order they are listed. */
export function technologies(name = '') {
  return TECH.filter((t) => t.match.test(String(name)));
}

/**
 * The five claims shown beside the price.
 *
 * The product's own technologies come first; the general promises fill the row
 * out so it never looks half-finished on a product with a plain name.
 */
export function featureList(name = '') {
  const own = technologies(name).map((t) => ({ id: t.id, label: t.label, note: t.note }));

  const general = [
    { id: 'safe', label: 'Safe & Healthy Water', note: 'Clean, great-tasting drinking water' },
    { id: 'care', label: 'Low Maintenance', note: 'Service reminders and easy filter change' },
    { id: 'home', label: 'Ideal for Home Use', note: 'Compact, quiet and wall-mountable' },
  ];

  return [...own, ...general].slice(0, 5);
}

/**
 * The journey of one glass of water through this product: tap in, each stage
 * the name claims, clean water out.
 */
export function purificationSteps(name = '') {
  const stages = technologies(name).map((t) => t.step);

  return [
    { title: 'Tap Water In', note: 'Water from your supply enters the purifier' },
    ...(stages.length ? stages : [
      { title: 'Filtration', note: 'Dirt, mud and visible impurities are held back' },
      { title: 'Purification', note: 'Bacteria and harmful microorganisms are removed' },
    ]),
    { title: 'Clean Water Out', note: 'Safe, healthy and great-tasting water for your family' },
  ].slice(0, 6);
}
