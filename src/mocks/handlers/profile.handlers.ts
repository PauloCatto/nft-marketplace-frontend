import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { getUserIdFromRequest, requireAuth } from './auth.handlers';

function resolveProfileUser(request: Request): { userId: string; errorResponse?: Response } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = requireAuth(request);
    if (auth.errorResponse) return { userId: 'user-kurio', errorResponse: auth.errorResponse };
    return { userId: auth.userId };
  }
  return { userId: getUserIdFromRequest(request) || 'user-kurio' };
}

export const profileHandlers = [
  
  http.get('*/api/profile', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveProfileUser(request);
    if (errorResponse) return errorResponse;

    const user = db.findUserById(userId) || db.findUserById('user-alex');

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

  
  http.put('*/api/profile', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveProfileUser(request);
    if (errorResponse) return errorResponse;

    const body = (await request.json()) as { name?: string; bio?: string; avatarUrl?: string };

    const targetId = db.findUserById(userId) ? userId : 'user-alex';
    const updated = db.updateUser(targetId, body);
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

  
  http.put('*/api/profile/password', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveProfileUser(request);
    if (errorResponse) return errorResponse;

    const targetId = db.findUserById(userId) ? userId : 'user-alex';
    const user = db.findUserById(targetId);
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

    db.updatePassword(targetId, `simulated_hash_${body.newPassword}`);
    return HttpResponse.json({ success: true, message: 'Senha atualizada com sucesso.' });
  }),
];
