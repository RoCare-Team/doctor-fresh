import { requirePage } from '@/lib/admin/guard';
import { listLocations } from '@/lib/sql/locations';
import LocationManager from '@/components/admin/LocationManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'GMB Locations' };

export default async function AdminLocationsPage() {
  await requirePage('locations');
  const locations = (await listLocations()) || [];
  return <LocationManager locations={locations} />;
}
