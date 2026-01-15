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

      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          email: data.email,
          created_by: user.id,
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
