import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';

export function getUserIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (token.startsWith('simulated-jwt-')) {
    return token.replace('simulated-jwt-', '');
  }
  return null;
}

export const authHandlers = [
  // POST */api/auth/login
  http.post('*/api/auth/login', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email e senha são obrigatórios' } },
        { status: 400 }
      );
    }

    if (scenario.invalidCredentialsError) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } },
        { status: 401 }
      );
    }

    const user = db.findUserByEmail(body.email);
    // Verificação de senha simulada (documentada como mock)
    if (!user || user.simulatedPasswordHash !== `simulated_hash_${body.password}`) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos' } },
        { status: 401 }
      );
    }

    const token = `simulated-jwt-${user.id}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return HttpResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      expiresAt,
    });
  }),

  // POST */api/auth/register
  http.post('*/api/auth/register', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const body = (await request.json()) as { name?: string; email?: string; password?: string };

    if (!body.name || !body.email || !body.password) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Todos os campos são obrigatórios' } },
        { status: 400 }
      );
    }

    const existing = db.findUserByEmail(body.email);
    if (existing) {
      return HttpResponse.json(
        { error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Este email já está cadastrado' } },
        { status: 409 }
      );
    }

    const newUser = db.createUser({
      name: body.name,
      email: body.email,
      passwordHash: `simulated_hash_${body.password}`,
    });

    const token = `simulated-jwt-${newUser.id}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return HttpResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          bio: newUser.bio,
          avatarUrl: newUser.avatarUrl,
          createdAt: newUser.createdAt,
        },
        expiresAt,
      },
      { status: 201 }
    );
  }),

  // GET */api/auth/me
  http.get('*/api/auth/me', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    if (scenario.sessionExpired) {
      return HttpResponse.json(
        { error: { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Faça login novamente.' } },
        { status: 401 }
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token de autenticação não fornecido' } },
        { status: 401 }
      );
    }

    const user = db.findUserById(userId);
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  }),

  // POST */api/auth/logout
  http.post('*/api/auth/logout', async () => {
    return HttpResponse.json({ success: true });
  }),
];
