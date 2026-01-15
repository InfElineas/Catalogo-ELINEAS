import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AppConfig {
  general: {
    company_name: string;
    currency: string;
    language: string;
  };
  pdf: {
    include_images: boolean;
    page_size: string;
    orientation: string;
  };
  import: {
    auto_detect_headers: boolean;
    skip_empty_rows: boolean;
  };
}

const defaultConfig: AppConfig = {
  general: {
    company_name: 'Mi Empresa',
    currency: 'USD',
    language: 'es',
  },
  pdf: {
    include_images: false,
    page_size: 'letter',
    orientation: 'portrait',
  },
  import: {
    auto_detect_headers: true,
    skip_empty_rows: true,
  },
};

export function useAppConfig() {
  return useQuery({
    queryKey: ['app-config'],
    queryFn: async (): Promise<AppConfig> => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('key, value');

        if (error) throw error;

        const config = { ...defaultConfig };

        (data || []).forEach((item: { key: string; value: any }) => {
          if (item.key === 'general' && item.value) {
            config.general = { ...defaultConfig.general, ...item.value };
          }
          if (item.key === 'pdf' && item.value) {
            config.pdf = { ...defaultConfig.pdf, ...item.value };
          }
          if (item.key === 'import' && item.value) {
            config.import = { ...defaultConfig.import, ...item.value };
          }
        });

        return config;
      } catch (error) {
        console.error('Error fetching config:', error);
        return defaultConfig;
      }
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          key,
          value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
      toast.success('Configuración guardada');
    },
    onError: (error) => {
      console.error('Error updating config:', error);
      toast.error('Error al guardar la configuración');
    },
  });
}
