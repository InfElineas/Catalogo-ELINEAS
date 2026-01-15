import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AssignedCatalog {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
  item_count: number;
  cover_image?: string;
}

export interface ClientCatalogItem {
  id: string;
  code: string;
  name: string;
  price_usd: number;
  category: string | null;
  store_name: string | null;
  supplier: string | null;
  image_url: string | null;
  is_selected: boolean;
  is_active: boolean;
}

export function useClientCatalogs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-catalogs', user?.id],
    queryFn: async (): Promise<AssignedCatalog[]> => {
      if (!user) return [];

      // Get client record for current user
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) return [];

      // Get assigned catalogs
      const { data: assignments, error: assignError } = await supabase
        .from('catalog_clients')
        .select('catalog_id')
        .eq('client_id', clientData.id);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const catalogIds = assignments.map(a => a.catalog_id);

      // Get catalog details
      const { data: catalogs, error: catError } = await supabase
        .from('catalogs')
        .select('*')
        .in('id', catalogIds)
        .eq('status', 'published')
        .is('deleted_at', null);

      if (catError) throw catError;

      // Get item counts for each catalog
      const catalogsWithCounts: AssignedCatalog[] = await Promise.all(
        (catalogs || []).map(async (catalog) => {
          // Get the published version
          const { data: version } = await supabase
            .from('catalog_versions')
            .select('id')
            .eq('catalog_id', catalog.id)
            .eq('status', 'published')
            .maybeSingle();

          let itemCount = 0;
          if (version) {
            const { count } = await supabase
              .from('catalog_items')
              .select('*', { count: 'exact', head: true })
              .eq('version_id', version.id)
              .eq('is_active', true)
              .is('deleted_at', null);
            itemCount = count || 0;
          }

          return {
            id: catalog.id,
            name: catalog.name,
            description: catalog.description,
            status: catalog.status,
            updated_at: catalog.updated_at,
            item_count: itemCount,
          };
        })
      );

      return catalogsWithCounts;
    },
    enabled: !!user,
  });
}

export function useClientCatalogItems(catalogId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-catalog-items', catalogId, user?.id],
    queryFn: async (): Promise<ClientCatalogItem[]> => {
      if (!catalogId || !user) return [];

      // Get the published version for this catalog
      const { data: version, error: versionError } = await supabase
        .from('catalog_versions')
        .select('id')
        .eq('catalog_id', catalogId)
        .eq('status', 'published')
        .maybeSingle();

      if (versionError) throw versionError;
      if (!version) return [];

      // Get items for this version
      const { data: items, error: itemsError } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('version_id', version.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (itemsError) throw itemsError;

      return (items || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        price_usd: Number(item.price_usd),
        category: item.category,
        store_name: item.store_name,
        supplier: item.supplier,
        image_url: item.image_url,
        is_selected: item.is_selected,
        is_active: item.is_active,
      }));
    },
    enabled: !!catalogId && !!user,
  });
}
