import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CatalogItemData } from '@/lib/catalogDiff';

interface UpdateCatalogParams {
  catalogId: string;
  baseVersionNumber: number;
  items: CatalogItemData[];
  onProgress?: (progress: number, message: string) => void;
}

interface UpdateResult {
  catalogId: string;
  versionId: string;
  itemsImported: number;
}

const BATCH_SIZE = 100;

export function useUpdateCatalogImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ catalogId, baseVersionNumber, items, onProgress }: UpdateCatalogParams): Promise<UpdateResult> => {
      if (!user) throw new Error('Usuario no autenticado');

      onProgress?.(5, 'Creando nueva versión...');

      const { data: version, error: versionError } = await supabase
        .from('catalog_versions')
        .insert({
          catalog_id: catalogId,
          version_number: baseVersionNumber + 1,
          status: 'draft',
          created_by: user.id,
          notes: `Actualización con ${items.length} productos`,
        })
        .select()
        .single();

      if (versionError) {
        console.error('Error creating version:', versionError);
        throw new Error('Error al crear la versión del catálogo');
      }

      const catalogItems = items.map((item) => ({
        version_id: version.id,
        code: item.code,
        name: item.name,
        price_usd: item.price_usd,
        category: item.category,
        category_f1: item.category_f1,
        category_f2: item.category_f2,
        category_f3: item.category_f3,
        supplier: item.supplier,
        warehouse: item.warehouse,
        store_id: item.store_id,
        store_name: item.store_name,
        image_url: item.image_url,
        image_filter: item.image_filter,
        states: item.states,
        extra_prices: item.extra_prices,
        flags: item.flags,
        is_selected: item.is_selected,
        is_active: item.is_active,
      }));

      const totalBatches = Math.ceil(catalogItems.length / BATCH_SIZE);
      let insertedCount = 0;

      for (let i = 0; i < catalogItems.length; i += BATCH_SIZE) {
        const batch = catalogItems.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        onProgress?.(
          10 + Math.round((batchNumber / totalBatches) * 85),
          `Actualizando productos (${Math.min(i + BATCH_SIZE, catalogItems.length)}/${catalogItems.length})...`
        );

        const { error: insertError } = await supabase
          .from('catalog_items')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          toast.error(`Error en lote ${batchNumber}: ${insertError.message}`);
        } else {
          insertedCount += batch.length;
        }
      }

      onProgress?.(100, 'Actualización completada');

      return {
        catalogId,
        versionId: version.id,
        itemsImported: insertedCount,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalog', data.catalogId] });
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-versions', data.catalogId] });
      toast.success('Catálogo actualizado exitosamente');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el catálogo');
    },
  });
}
