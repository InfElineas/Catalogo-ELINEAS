import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CatalogItem {
  id: string;
  version_id: string;
  code: string;
  name: string;
  price_usd: number;
  category: string | null;
  category_f1: string | null;
  category_f2: string | null;
  category_f3: string | null;
  supplier: string | null;
  warehouse: string | null;
  store_id: string | null;
  store_name: string | null;
  image_url: string | null;
  is_selected: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CatalogVersion {
  id: string;
  catalog_id: string;
  version_number: number;
  status: 'draft' | 'published' | 'archived';
  notes: string | null;
  source_file_url: string | null;
  created_by: string;
  created_at: string;
  published_at: string | null;
}

export function useCatalogVersions(catalogId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalog-versions', catalogId],
    queryFn: async () => {
      if (!catalogId) return [];

      const { data, error } = await supabase
        .from('catalog_versions')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as CatalogVersion[];
    },
    enabled: !!user && !!catalogId,
  });
}

export function useCatalogItems(versionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['catalog-items', versionId],
    queryFn: async () => {
      if (!versionId) return [];

      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('version_id', versionId)
        .is('deleted_at', null)
        .order('code', { ascending: true });

      if (error) throw error;
      return data as CatalogItem[];
    },
    enabled: !!user && !!versionId,
  });
}

export function useUpdateCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CatalogItem> & { id: string }) => {
      const { data: item, error } = await supabase
        .from('catalog_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items', data.version_id] });
      toast.success('Producto actualizado');
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar el producto');
    },
  });
}

export function useDeleteCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, versionId }: { id: string; versionId: string }) => {
      // Soft delete
      const { error } = await supabase
        .from('catalog_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return versionId;
    },
    onSuccess: (versionId) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items', versionId] });
      toast.success('Producto eliminado');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Error al eliminar el producto');
    },
  });
}

export function useBulkUpdateItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemIds, 
      updates,
      versionId 
    }: { 
      itemIds: string[]; 
      updates: Partial<CatalogItem>;
      versionId: string;
    }) => {
      const { error } = await supabase
        .from('catalog_items')
        .update(updates)
        .in('id', itemIds);

      if (error) throw error;
      return versionId;
    },
    onSuccess: (versionId) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items', versionId] });
      toast.success('Productos actualizados');
    },
    onError: (error) => {
      console.error('Error bulk updating items:', error);
      toast.error('Error al actualizar los productos');
    },
  });
}

export function usePublishVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ versionId, catalogId }: { versionId: string; catalogId: string }) => {
      // First, archive all other published versions
      await supabase
        .from('catalog_versions')
        .update({ status: 'archived' })
        .eq('catalog_id', catalogId)
        .eq('status', 'published');

      // Publish this version
      const { error } = await supabase
        .from('catalog_versions')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', versionId);

      if (error) throw error;

      // Update catalog status
      await supabase
        .from('catalogs')
        .update({ status: 'published' })
        .eq('id', catalogId);

      return { versionId, catalogId };
    },
    onSuccess: ({ catalogId }) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-versions', catalogId] });
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Versión publicada');
    },
    onError: (error) => {
      console.error('Error publishing version:', error);
      toast.error('Error al publicar la versión');
    },
  });
}
