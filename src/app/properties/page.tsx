'use client';

import { useMemo, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PropertyTile } from '@/components/app/property-tile';
import { PropertyTileSkeleton } from '@/components/app/skeletons';
import AddApartmentModal from '@/components/ui/AddApartmentModal';
import EditApartmentModal from '@/components/ui/EditApartmentModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApartments } from '@/hooks/useApartments';
import type { Apartment } from '@/lib/types';

function propertyName(apartment: Apartment) {
  return apartment.uplisting_name || `Apt ${apartment.apartment_number}`;
}

function PropertiesContent() {
  const { apartments, loading, refreshApartments } = useApartments();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...apartments].sort((a, b) =>
      propertyName(a).localeCompare(propertyName(b))
    );
    if (!q) return list;
    return list.filter((apt) => {
      const name = propertyName(apt);
      return (
        name.toLowerCase().includes(q) ||
        apt.owner_name.toLowerCase().includes(q) ||
        (apt.address || '').toLowerCase().includes(q) ||
        apt.apartment_number.toLowerCase().includes(q)
      );
    });
  }, [apartments, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Properties"
        description="Apartments and listings on the cleaning schedule."
        actions={
          <Button className="min-h-11" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} />
            Add property
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties…"
          className="min-h-11 pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyTileSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? 'No matching properties' : 'No properties yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'Add an apartment to start scheduling cleans.'
          }
          actionLabel={search ? undefined : 'Add property'}
          onAction={search ? undefined : () => setAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((apartment) => (
            <PropertyTile
              key={apartment.id}
              name={propertyName(apartment)}
              active={apartment.is_active !== false}
              nextCleanDate={null}
              onClick={() => {
                setEditing(apartment);
                setEditOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <div className="md:hidden">
        <Button
          className="fixed right-4 z-40 size-14 rounded-full shadow-xs"
          style={{ bottom: 'calc(4.75rem + var(--safe-bottom))' }}
          size="icon"
          aria-label="Add property"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-6" strokeWidth={1.75} />
        </Button>
      </div>

      <AddApartmentModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          void refreshApartments();
        }}
      />
      <EditApartmentModal
        isOpen={editOpen}
        apartment={editing}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setEditOpen(false);
          setEditing(null);
          void refreshApartments();
        }}
      />
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <AuthWrapper>
      <PropertiesContent />
    </AuthWrapper>
  );
}
