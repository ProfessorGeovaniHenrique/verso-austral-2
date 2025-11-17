import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Setup auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Fetch role após mudança de sessão
        if (currentSession?.user) {
          setTimeout(() => {
            fetchUserRole(currentSession.user.id);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserRole(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role ?? null);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard-mvp`,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithInvite = async (
    email: string,
    password: string,
    inviteKey: string
  ) => {
    try {
      // 1. Criar conta
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard-mvp`,
        },
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Validar convite
      const { data: inviteData, error: inviteError } = await supabase
        .from("invite_keys")
        .select("*")
        .eq("key_code", inviteKey.toUpperCase())
        .eq("is_active", true)
        .is("used_at", null)
        .maybeSingle();

      if (inviteError || !inviteData) {
        throw new Error("Código de convite inválido ou já utilizado");
      }

      // Verificar expiração
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        throw new Error("Código de convite expirado");
      }

      // 3. Marcar convite como usado (trigger cria role automaticamente)
      const { error: updateError } = await supabase
        .from("invite_keys")
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
        })
        .eq("id", inviteData.id);

      if (updateError) throw updateError;

      // 4. Fazer logout (usuário precisa fazer login manualmente)
      await supabase.auth.signOut();

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setRole(null);
    }
    return { error };
  };

  const isAdmin = () => role === "admin";
  const isEvaluator = () => role === "evaluator";

  return {
    user,
    session,
    role,
    loading,
    signUp,
    signIn,
    signInWithInvite,
    signOut,
    isAdmin,
    isEvaluator,
  };
}
