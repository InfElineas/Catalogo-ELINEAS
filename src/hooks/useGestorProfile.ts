import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GestorProfileData {
  user_id: string;
  sales_description: string | null;
}

export function useGestorProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gestor-profile', user?.id],
    queryFn: async (): Promise<GestorProfileData | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('gestor_profiles')
        .select('user_id, sales_description')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as GestorProfileData;
    },
    enabled: !!user,
  });
}

export function useUpdateGestorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sales_description: string | null }) => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data: updated, error } = await supabase
        .from('gestor_profiles')
        .upsert({
          user_id: user.id,
          sales_description: data.sales_description,
        })
        .select('user_id, sales_description')
        .single();

      if (error) throw error;
      return updated as GestorProfileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestor-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['gestors'] });
      toast.success('Perfil comercial actualizado');
    },
    onError: (error) => {
      console.error('Error updating gestor profile:', error);
      toast.error('Error al actualizar el perfil comercial');
    },
  });
}
