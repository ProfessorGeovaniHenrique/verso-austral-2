import { supabase } from '@/integrations/supabase/client';

/**
 * Criar usuário de teste com role específica
 */
export async function createTestUserToken(role: 'admin' | 'user'): Promise<string> {
  const testEmail = `test-${role}-${Date.now()}@example.com`;
  const testPassword = 'Test@12345';

  // 1. Criar usuário temporário
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (signUpError || !authData.user) {
    throw new Error(`Failed to create test user: ${signUpError?.message}`);
  }

  // 2. Atribuir role
  const { error: roleError } = await supabase.from('user_roles').insert({
    user_id: authData.user.id,
    role: role
  });

  if (roleError) {
    throw new Error(`Failed to assign role: ${roleError.message}`);
  }

  // 3. Fazer login para obter token
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError || !sessionData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return sessionData.session.access_token;
}

/**
 * Limpar usuários de teste após testes
 */
export async function cleanupTestUsers() {
  try {
    // Buscar usuários de teste
    const { data } = await supabase.auth.admin.listUsers();
    
    if (!data?.users) return;

    const testUsers = data.users.filter((u: any) => u.email?.includes('test-'));
    
    // Deletar cada usuário de teste
    for (const user of testUsers) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  } catch (error) {
    console.error('Failed to cleanup test users:', error);
  }
}

/**
 * Helper para fazer múltiplas requisições
 */
export async function makeRequests(
  count: number, 
  url: string, 
  options: RequestInit
): Promise<Response[]> {
  const requests = Array.from({ length: count }, () => 
    fetch(url, options)
  );
  return Promise.all(requests);
}

/**
 * Helper para esperar (sleep)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
