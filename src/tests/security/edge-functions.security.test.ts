import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUserToken, cleanupTestUsers, makeRequests } from '../utils/edge-function-helpers';

const EDGE_FUNCTION_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

describe('Edge Functions - Autenticação', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    adminToken = await createTestUserToken('admin');
    userToken = await createTestUserToken('user');
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('send-invite-email: deve bloquear chamadas sem JWT', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/send-invite-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        inviteCode: 'TEST123',
        role: 'user'
      })
    });
    expect(response.status).toBe(401);
  });

  it('send-invite-email: deve bloquear JWT inválido', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/send-invite-email`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_token_123',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        inviteCode: 'TEST123',
        role: 'user'
      })
    });
    expect(response.status).toBe(401);
  });

  it('send-invite-email: deve bloquear usuários não-admin', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/send-invite-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        inviteCode: 'TEST123',
        role: 'user'
      })
    });
    expect(response.status).toBe(403);
  });

  it('send-invite-email: deve permitir admins autenticados', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/send-invite-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        inviteCode: 'TEST123',
        role: 'user'
      })
    });
    expect([200, 201]).toContain(response.status);
  });
});

describe('Edge Functions - Autorização RBAC', () => {
  let userToken: string;

  beforeAll(async () => {
    userToken = await createTestUserToken('user');
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('annotate-semantic: demo_mode=true deve funcionar sem JWT', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corpus_type: 'gaucho', demo_mode: true })
    });
    expect(response.status).toBe(200);
  }, 30000);

  it('annotate-pos: deve aceitar requisições sem auth', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-pos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        texto: 'Teste de anotação POS',
        idioma: 'pt'
      })
    });
    expect(response.status).toBe(200);
  }, 30000);
});

describe('Edge Functions - Rate Limiting', () => {
  it('annotate-semantic: deve aplicar rate limit após limite de requisições', async () => {
    const requests: Promise<Response>[] = [];
    
    // Fazer 12 requisições rapidamente (limite é 10/min)
    for (let i = 0; i < 12; i++) {
      requests.push(
        fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-semantic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corpus_type: 'gaucho', demo_mode: true })
        })
      );
    }

    const responses = await Promise.all(requests);
    
    // Verificar se pelo menos uma das últimas requisições foi bloqueada
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    expect(rateLimitedCount).toBeGreaterThan(0);
  }, 60000);
});

describe('Edge Functions - Validação de Input', () => {
  it('annotate-semantic: deve rejeitar payload vazio', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(400);
  });

  it('annotate-semantic: deve rejeitar corpus_type inválido', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corpus_type: 'invalid', demo_mode: true })
    });
    expect(response.status).toBe(400);
  });

  it('annotate-pos: deve rejeitar payload vazio', async () => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/annotate-pos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(400);
  });
});
