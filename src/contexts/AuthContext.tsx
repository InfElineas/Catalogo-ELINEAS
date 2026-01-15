import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'gestor' | 'cliente' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isGestor: boolean;
  isCliente: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<AppRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      
      return data?.role as AppRole || null;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            const userRole = await fetchUserRole(newSession.user.id);
            setRole(userRole);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchUserRole(existingSession.user.id).then(userRole => {
          setRole(userRole);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, signUpRole: AppRole) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, role: signUpRole || 'cliente' }
        }
      });
      
      if (error) return { error: new Error(error.message) };

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    isGestor: role === 'gestor',
    isCliente: role === 'cliente',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
