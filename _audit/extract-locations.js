const fs = require('fs');

const MAP = [
  { key: 'ro-service', prefix: 'ro-service', files: ['ro-services-localities', 'ro-service-cities'] },
  { key: 'water-purifier', prefix: 'water-purifier', files: ['water-purifier'] },
  { key: 'ro-plant', prefix: 'ro-plant', files: ['ro-plant'] },
  { key: 'water-softener', prefix: 'water-softener', files: ['water-softener'] },
  { key: 'water-ionizer', prefix: 'water-ionizer', files: ['water-ionizer'] },
  { key: 'water-cooled-chiller', prefix: 'water-cooled-chiller', files: ['water-chiller'] },
  { key: 'water-atm-machine-manufacturers', prefix: 'water-atm-machine-manufacturers', files: ['water-atm'] },
  { key: 'dm-plant-manufacturers', prefix: 'dm-plant-manufacturers', files: ['dm-plant-manufacturer'] },
  { key: 'effluent-treatment-plant-manufacturers', prefix: 'effluent-treatment-plant-manufacturers', files: ['etp-plant'] },
  { key: 'sewage-treatment-plant-manufacturers', prefix: 'sewage-treatment-plant-manufacturers', files: ['stp-sitemap'] },
];

const urlsOf = (f) => fs.readFileSync(`sitemaps/${f}.xml`, 'utf8')
  .split('\n').map((l) => (l.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1])
  .filter(Boolean).map((u) => decodeURIComponent(u.trim().replace('https://www.doctorfresh.in/', '')));

const out = {};
let total = 0;
for (const m of MAP) {
  const set = new Set();
  for (const f of m.files) {
    for (const path of urlsOf(f)) {
      if (!path.startsWith(m.prefix + '-')) continue;
      const loc = path.slice(m.prefix.length + 1);
      if (!loc || loc.includes('/')) continue;
      set.add(loc);
    }
  }
  out[m.key] = [...set].sort();
  total += out[m.key].length;
  console.log(m.key, out[m.key].length);
}
console.log('TOTAL', total);

fs.writeFileSync('locations.json', JSON.stringify(out));
console.log('bytes', fs.statSync('locations.json').size);
