import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { requireAuth } from './auth.handlers';

export const profileHandlers = [
  // GET */api/profile
  http.get('*/api/profile', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const user = db.findUserById(userId);

    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Perfil não encontrado' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  }),

  // PUT */api/profile
  http.put('*/api/profile', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const body = (await request.json()) as { name?: string; bio?: string; avatarUrl?: string };

    const updated = db.updateUser(userId, body);
    if (!updated) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
    });
  }),

  // PUT */api/profile/password
  http.put('*/api/profile/password', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const user = db.findUserById(userId);
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };

    if (!user || user.simulatedPasswordHash !== `simulated_hash_${body.currentPassword}`) {
      return HttpResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: 'A senha atual está incorreta.' } },
        { status: 400 }
      );
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      return HttpResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'A nova senha deve ter no mínimo 6 caracteres.' } },
        { status: 400 }
      );
    }

    db.updatePassword(userId, `simulated_hash_${body.newPassword}`);
    return HttpResponse.json({ success: true, message: 'Senha atualizada com sucesso.' });
  }),
];
