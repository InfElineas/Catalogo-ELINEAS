import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GestorProfile {
  id: string;
  full_name: string | null;
  email: string;
  sales_description: string | null;
}

export interface AssignedGestorProfile extends GestorProfile {}

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
        .select('id, email, full_name, gestor_profiles(sales_description)')
        .in('id', gestorIds)
        .order('full_name', { ascending: true, nullsFirst: false });

      if (profilesError) throw profilesError;

      return (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        sales_description: Array.isArray(profile.gestor_profiles)
          ? profile.gestor_profiles[0]?.sales_description ?? null
          : null,
      }));
    },
  });
}

export function useAssignedGestor() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['assigned-gestor', user?.id],
    queryFn: async (): Promise<AssignedGestorProfile | null> => {
      if (!user) return null;

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('gestor_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!client?.gestor_id) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, gestor_profiles(sales_description)')
        .eq('id', client.gestor_id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        sales_description: Array.isArray(profile.gestor_profiles)
          ? profile.gestor_profiles[0]?.sales_description ?? null
          : null,
      };
    },
    enabled: !!user,
  });
}
