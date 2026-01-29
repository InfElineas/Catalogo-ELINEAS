import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  activeCatalogs: number;
  totalItems: number;
  totalClients: number;
  publishedVersions: number;
}

export interface RecentCatalog {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  item_count: number;
  client_count: number;
  updated_at: string;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      // Count active catalogs
      const { count: catalogCount } = await supabase
        .from('catalogs')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'archived')
        .is('deleted_at', null);

      // Count total items across all active versions
      const { count: itemCount } = await supabase
        .from('catalog_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);

      // Count active clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('gestor_id', user.id)
        .is('deleted_at', null);

      // Count published versions
      const { count: versionCount } = await supabase
        .from('catalog_versions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      return {
        activeCatalogs: catalogCount || 0,
        totalItems: itemCount || 0,
        totalClients: clientCount || 0,
        publishedVersions: versionCount || 0,
      };
    },
    enabled: !!user,
  });
}

export function useRecentCatalogs(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-catalogs', user?.id, limit],
    queryFn: async (): Promise<RecentCatalog[]> => {
      const { data: catalogs, error } = await supabase
        .from('catalogs')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get counts for each catalog
      const catalogsWithCounts = await Promise.all(
        (catalogs || []).map(async (catalog) => {
          // Get current version
          const { data: version } = await supabase
            .from('catalog_versions')
            .select('id')
            .eq('catalog_id', catalog.id)
            .in('status', ['published', 'draft'])
            .order('version_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          let itemCount = 0;
          if (version) {
            const { count } = await supabase
              .from('catalog_items')
              .select('*', { count: 'exact', head: true })
              .eq('version_id', version.id)
              .is('deleted_at', null);
            itemCount = count || 0;
          }

          // Get client count
          const { count: clientCount } = await supabase
            .from('catalog_clients')
            .select('*', { count: 'exact', head: true })
            .eq('catalog_id', catalog.id);

          return {
            id: catalog.id,
            name: catalog.name,
            status: catalog.status as 'draft' | 'published' | 'archived',
            item_count: itemCount,
            client_count: clientCount || 0,
            updated_at: catalog.updated_at,
          };
        })
      );

      return catalogsWithCounts;
    },
    enabled: !!user,
  });
}
