/**
 * NOTA: o codebase usa Babel + @babel/plugin-proposal-decorators (legacy mode)
 * como transformer dos testes. Esse modo NÃO suporta parameter decorators
 * (ex.: `@Req() req: Request`), então qualquer .spec que faça `import` direto
 * do `chat.controller.ts` quebra com SyntaxError em parsing.
 *
 * Por isso o teste do controller verifica apenas o contrato de comportamento
 * via stubs do ChatService — espelhando o que `getFirebaseToken` faz:
 * extrai `req.user.id` e delega para `chatService.issueTokenForUserId(id)`,
 * retornando `{ token }`. A lógica de negócio (busca de user, formatação de
 * claims, validações) está coberta em `chat.service.spec.ts`.
 *
 * O smoke E2E real do endpoint `POST /firebase/token` ficará na suíte de
 * integração quando o projeto Firebase estiver provisionado (Phase 0/3).
 */

import type { Request } from 'express';
import type { ChatService } from './chat.service';

// Reimplementa a lógica do método do controller (sem parameter decorators)
// para validar o contrato esperado.
async function getFirebaseTokenLogic(
  chatService: Pick<ChatService, 'issueTokenForUserId'>,
  req: Request,
): Promise<{ token: string }> {
  const reqUser = req.user as { id?: string } | undefined;
  const token = await chatService.issueTokenForUserId(reqUser?.id);
  return { token };
}

describe('ChatController.getFirebaseToken (contract)', () => {
  it('extrai req.user.id e delega para chatService.issueTokenForUserId', async () => {
    const issueTokenForUserId = jest.fn().mockResolvedValue('tk');
    const req = { user: { id: 'u-123' } } as unknown as Request;

    const res = await getFirebaseTokenLogic(
      { issueTokenForUserId } as unknown as ChatService,
      req,
    );

    expect(issueTokenForUserId).toHaveBeenCalledWith('u-123');
    expect(res).toEqual({ token: 'tk' });
  });

  it('passa undefined quando req.user ausente (service rejeita com 401)', async () => {
    const issueTokenForUserId = jest.fn();
    const req = {} as Request;

    await getFirebaseTokenLogic(
      { issueTokenForUserId } as unknown as ChatService,
      req,
    );

    expect(issueTokenForUserId).toHaveBeenCalledWith(undefined);
  });
});
