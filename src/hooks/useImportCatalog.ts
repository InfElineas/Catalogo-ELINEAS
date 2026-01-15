import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ColumnMapping } from '@/components/import/ColumnMapper';
import { transformRowToCatalogItem } from '@/lib/dataValidator';

interface ImportCatalogParams {
  catalogName: string;
  catalogDescription?: string;
  rows: Record<string, string | number | null>[];
  mappings: ColumnMapping[];
  onProgress?: (progress: number, message: string) => void;
}

interface ImportResult {
  catalogId: string;
  versionId: string;
  itemsImported: number;
}

const BATCH_SIZE = 100; // Insert items in batches

export function useImportCatalog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      catalogName, 
      catalogDescription,
      rows, 
      mappings,
      onProgress 
    }: ImportCatalogParams): Promise<ImportResult> => {
      if (!user) throw new Error('Usuario no autenticado');

      onProgress?.(5, 'Creando catálogo...');

      // 1. Create the catalog
      const { data: catalog, error: catalogError } = await supabase
        .from('catalogs')
        .insert({
          name: catalogName,
          description: catalogDescription || null,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (catalogError) {
        console.error('Error creating catalog:', catalogError);
        throw new Error('Error al crear el catálogo');
      }

      onProgress?.(15, 'Creando versión...');

      // 2. Create the version
      const { data: version, error: versionError } = await supabase
        .from('catalog_versions')
        .insert({
          catalog_id: catalog.id,
          version_number: 1,
          status: 'draft',
          created_by: user.id,
          notes: `Importación inicial de ${rows.length} productos`,
        })
        .select()
        .single();

      if (versionError) {
        console.error('Error creating version:', versionError);
        // Try to cleanup the catalog
        await supabase.from('catalogs').delete().eq('id', catalog.id);
        throw new Error('Error al crear la versión del catálogo');
      }

      onProgress?.(25, 'Preparando productos...');

      // 3. Transform rows to catalog items
      const catalogItems = rows.map(row => {
        const transformed = transformRowToCatalogItem(row, mappings);
        return {
          version_id: version.id,
          code: transformed.code as string,
          name: transformed.name as string,
          price_usd: transformed.price_usd as number,
          category: transformed.category as string | null,
          category_f1: transformed.category_f1 as string | null,
          category_f2: transformed.category_f2 as string | null,
          category_f3: transformed.category_f3 as string | null,
          supplier: transformed.supplier as string | null,
          warehouse: transformed.warehouse as string | null,
          store_id: transformed.store_id as string | null,
          store_name: transformed.store_name as string | null,
          image_url: transformed.image_url as string | null,
          image_filter: transformed.image_filter as string | null,
          states: transformed.states as Record<string, string>,
          extra_prices: transformed.extra_prices as Record<string, number>,
          flags: transformed.flags as Record<string, boolean>,
          is_selected: transformed.is_selected as boolean,
          is_active: transformed.is_active as boolean,
        };
      });

      // 4. Insert items in batches
      const totalBatches = Math.ceil(catalogItems.length / BATCH_SIZE);
      let insertedCount = 0;

      for (let i = 0; i < catalogItems.length; i += BATCH_SIZE) {
        const batch = catalogItems.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        
        onProgress?.(
          25 + Math.round((batchNumber / totalBatches) * 70),
          `Importando productos (${Math.min(i + BATCH_SIZE, catalogItems.length)}/${catalogItems.length})...`
        );

        const { error: insertError } = await supabase
          .from('catalog_items')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          // Continue with other batches but log the error
          toast.error(`Error en lote ${batchNumber}: ${insertError.message}`);
        } else {
          insertedCount += batch.length;
        }
      }

      onProgress?.(100, '¡Importación completada!');

      return {
        catalogId: catalog.id,
        versionId: version.id,
        itemsImported: insertedCount,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Catálogo importado exitosamente');
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar el catálogo');
    },
  });
}
