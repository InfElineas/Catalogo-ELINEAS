import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'inactive';
  user_id: string | null;
  last_access: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ClientWithCatalogs extends Client {
  catalogs: { id: string; name: string }[];
}

export function useClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientWithCatalogs[]> => {
      if (!user) return [];

      const { data: existingClients, error: existingError } = await supabase
        .from('clients')
        .select('*');

      if (existingError) throw existingError;

      const { data: roleClients, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'cliente');

      if (roleError) throw roleError;

      const roleUserIds = (roleClients || []).map((role) => role.user_id);

      if (roleUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', roleUserIds);

        if (profilesError) throw profilesError;

        const clientsByUserId = new Map(
          (existingClients || []).filter((client) => client.user_id).map((client) => [client.user_id as string, client])
        );
        const clientsByEmail = new Map(
          (existingClients || []).map((client) => [client.email.toLowerCase(), client])
        );

        const upsertEntries: Array<Pick<Client, 'name' | 'email' | 'status' | 'user_id' | 'created_by' | 'deleted_at'>> = [];

        (profiles || []).forEach((profile) => {
          const profileEmail = profile.email.toLowerCase();
          const existingByUser = clientsByUserId.get(profile.id);
          const existingByEmail = clientsByEmail.get(profileEmail);
          const fallbackName = profile.full_name || profile.email.split('@')[0];

          upsertEntries.push({
            name: existingByUser?.name || existingByEmail?.name || fallbackName,
            email: profile.email,
            status: 'active',
            user_id: profile.id,
            created_by: existingByUser?.created_by || existingByEmail?.created_by || user.id,
            deleted_at: null,
          });
        });

        if (upsertEntries.length > 0) {
          const { error: upsertError } = await supabase
            .from('clients')
            .upsert(upsertEntries, { onConflict: 'email' });

          if (upsertError) throw upsertError;
        }
      }

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get catalogs for each client
      const clientsWithCatalogs = await Promise.all(
        (clients || []).map(async (client) => {
          const { data: assignments } = await supabase
            .from('catalog_clients')
            .select('catalog_id, catalogs(id, name)')
            .eq('client_id', client.id);

          const catalogs = (assignments || [])
            .map((a: any) => a.catalogs)
            .filter(Boolean);

          return { ...client, catalogs };
        })
      );

      return clientsWithCatalogs;
    },
    enabled: !!user,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      if (!user) throw new Error('Not authenticated');

      const normalizedEmail = data.email.trim().toLowerCase();

      const { data: existingClient, error: existingError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingError) throw existingError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (existingClient) {
        const { data: updatedClient, error: updateError } = await supabase
          .from('clients')
          .update({
            name: data.name,
            user_id: existingClient.user_id || profile?.id || null,
            deleted_at: null,
            status: 'active',
          })
          .eq('id', existingClient.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedClient;
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          email: normalizedEmail,
          status: 'active',
          created_by: user.id,
          user_id: profile?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating client:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un cliente con ese email');
      } else {
        toast.error('Error al crear el cliente');
      }
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const { data: client, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado');
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast.error('Error al actualizar el cliente');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    },
  });
}

export function useAssignCatalogToClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, catalogId }: { clientId: string; catalogId: string }) => {
      const { error } = await supabase
        .from('catalog_clients')
        .insert({ client_id: clientId, catalog_id: catalogId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Catálogo asignado al cliente');
    },
    onError: (error: any) => {
      console.error('Error assigning catalog:', error);
      if (error.code === '23505') {
        toast.error('El catálogo ya está asignado a este cliente');
      } else {
        toast.error('Error al asignar el catálogo');
      }
    },
  });
}

export function useUnassignCatalogFromClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, catalogId }: { clientId: string; catalogId: string }) => {
      const { error } = await supabase
        .from('catalog_clients')
        .delete()
        .eq('client_id', clientId)
        .eq('catalog_id', catalogId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      toast.success('Catálogo desasignado del cliente');
    },
    onError: (error) => {
      console.error('Error unassigning catalog:', error);
      toast.error('Error al desasignar el catálogo');
    },
  });
}
