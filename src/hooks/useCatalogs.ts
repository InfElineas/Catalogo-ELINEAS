import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Catalog {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AssignedClient {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface CatalogWithStats extends Catalog {
  item_count: number;
  client_count: number;
  current_version: number;
  assigned_clients?: AssignedClient[];
}

export function useCatalogs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async (): Promise<CatalogWithStats[]> => {
      const { data: catalogs, error } = await supabase
        .from('catalogs')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get stats for each catalog
      const catalogsWithStats = await Promise.all(
        (catalogs || []).map(async (catalog) => {
          // Get latest version
          const { data: versions } = await supabase
            .from('catalog_versions')
            .select('id, version_number')
            .eq('catalog_id', catalog.id)
            .order('version_number', { ascending: false })
            .limit(1);

          const latestVersion = versions?.[0];
          let itemCount = 0;

          if (latestVersion) {
            const { count } = await supabase
              .from('catalog_items')
              .select('*', { count: 'exact', head: true })
              .eq('version_id', latestVersion.id)
              .is('deleted_at', null);
            itemCount = count || 0;
          }

          // Get client count
          const { count: clientCount } = await supabase
            .from('catalog_clients')
            .select('*', { count: 'exact', head: true })
            .eq('catalog_id', catalog.id);

          return {
            ...catalog,
            item_count: itemCount,
            client_count: clientCount || 0,
            current_version: latestVersion?.version_number || 0,
          };
        })
      );

      return catalogsWithStats;
    },
    enabled: !!user,
  });
}

export function useCatalog(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalog', id],
    queryFn: async (): Promise<CatalogWithStats | null> => {
      if (!id) return null;

      const { data: catalog, error } = await supabase
        .from('catalogs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!catalog) return null;

      // Get latest version
      const { data: versions } = await supabase
        .from('catalog_versions')
        .select('id, version_number')
        .eq('catalog_id', catalog.id)
        .order('version_number', { ascending: false })
        .limit(1);

      const latestVersion = versions?.[0];
      let itemCount = 0;

      if (latestVersion) {
        const { count } = await supabase
          .from('catalog_items')
          .select('*', { count: 'exact', head: true })
          .eq('version_id', latestVersion.id)
          .is('deleted_at', null);
        itemCount = count || 0;
      }

      // Get client count
      const { count: clientCount } = await supabase
        .from('catalog_clients')
        .select('*', { count: 'exact', head: true })
        .eq('catalog_id', catalog.id);

      // Get assigned clients
      const { data: assignedClientsData } = await supabase
        .from('catalog_clients')
        .select('client_id, clients!inner(id, name, email, status)')
        .eq('catalog_id', catalog.id);

      const assigned_clients = (assignedClientsData || []).map((ac: any) => ac.clients);

      return {
        ...catalog,
        item_count: itemCount,
        client_count: clientCount || 0,
        current_version: latestVersion?.version_number || 0,
        assigned_clients,
      };
    },
    enabled: !!user && !!id,
  });
}

export function useCreateCatalog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; tags?: string[] }) => {
      if (!user) throw new Error('Not authenticated');

      // Create catalog
      const { data: catalog, error: catalogError } = await supabase
        .from('catalogs')
        .insert({
          name: data.name,
          description: data.description || null,
          tags: data.tags || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (catalogError) throw catalogError;

      // Create initial version
      const { error: versionError } = await supabase
        .from('catalog_versions')
        .insert({
          catalog_id: catalog.id,
          version_number: 1,
          status: 'draft',
          notes: 'Versión inicial',
          created_by: user.id,
        });

      if (versionError) throw versionError;

      return catalog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Catálogo creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creating catalog:', error);
      toast.error('Error al crear el catálogo');
    },
  });
}

export function useUpdateCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Catalog> & { id: string }) => {
      const { data: catalog, error } = await supabase
        .from('catalogs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return catalog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['catalog', variables.id] });
      toast.success('Catálogo actualizado');
    },
    onError: (error) => {
      console.error('Error updating catalog:', error);
      toast.error('Error al actualizar el catálogo');
    },
  });
}

export function useDeleteCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('catalogs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Catálogo eliminado');
    },
    onError: (error) => {
      console.error('Error deleting catalog:', error);
      toast.error('Error al eliminar el catálogo');
    },
  });
}
