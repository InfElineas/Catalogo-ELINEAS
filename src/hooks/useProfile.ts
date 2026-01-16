import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  sales_description: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, sales_description')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Omit<ProfileData, 'id' | 'email'>>) => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select('id, email, full_name, avatar_url, sales_description')
        .single();

      if (error) throw error;
      return updatedProfile as ProfileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil actualizado');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    },
  });
}
