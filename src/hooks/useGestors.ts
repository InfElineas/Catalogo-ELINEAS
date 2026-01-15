import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GestorProfile {
  id: string;
  full_name: string | null;
  email: string;
}

export function useGestors() {
  return useQuery({
    queryKey: ['gestors'],
    queryFn: async (): Promise<GestorProfile[]> => {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'gestor');

      if (roleError) throw roleError;

      const gestorIds = (roleRows || []).map((role) => role.user_id);
      if (gestorIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', gestorIds)
        .order('full_name', { ascending: true, nullsFirst: false });

      if (profilesError) throw profilesError;

      return profiles || [];
    },
  });
}
