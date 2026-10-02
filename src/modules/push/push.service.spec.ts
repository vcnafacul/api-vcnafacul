import { ServiceUnavailableException } from '@nestjs/common';
import { StatusDoEnvio } from './push-notification.entity';
import { PushService } from './push.service';

type Aparelho = { id: string; token: string; userId: string };

function aparelhos(n: number, usuarios = n): Aparelho[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    token: `tok${i}`,
    userId: `u${i % usuarios}`,
  }));
}

function montar({
  lista = aparelhos(3),
  habilitado = true,
  firebaseAtivo = true,
  resposta,
  pessoas = ['u0', 'u1', 'u2', 'u3'],
}: {
  lista?: Aparelho[];
  habilitado?: boolean;
  firebaseAtivo?: boolean;
  pessoas?: string[];
  resposta?: (tokens: string[]) => {
    success: boolean;
    error?: { code: string };
  }[];
} = {}) {
  const sendEachForMulticast = jest.fn(async ({ tokens }) => {
    const responses = resposta
      ? resposta(tokens)
      : tokens.map(() => ({ success: true }));
    return {
      responses,
      successCount: responses.filter((r) => r.success).length,
      failureCount: responses.filter((r) => !r.success).length,
    };
  });
  const env = {
    get: jest.fn(
      (k: string) =>
        ({
          PUSH_ENABLED: habilitado,
          FRONT_URL: 'https://vcnafacul.com.br',
          PUSH_DEFAULT_ICON_URL: '',
        })[k],
    ),
  };
  const firebase = {
    isEnabled: () => firebaseAtivo,
    messaging: () => ({ sendEachForMulticast }),
  };
  const devices = {
    ativosDoPublico: jest.fn().mockResolvedValue(lista),
    desativar: jest.fn().mockResolvedValue(undefined),
  };
  const notifications = {
    salvar: jest.fn(async (e) => {
      e.id = e.id ?? 'envio-1';
      return e;
    }),
    criarComCentral: jest.fn(async (e) => {
      e.id = e.id ?? 'envio-1';
      return e;
    }),
  };
  const central = {
    usuariosDoPublico: jest.fn().mockResolvedValue(pessoas),
  };
  const service = new PushService(
    env as any,
    firebase as any,
    devices as any,
    notifications as any,
    central as any,
  );
  return { service, sendEachForMulticast, devices, notifications, central };
}

const payload = { title: 'Aviso', body: 'Corpo', url: '/simulados' };

describe('PushService', () => {
  it('1.234 aparelhos → 3 chamadas de sendEachForMulticast (500/500/234)', async () => {
    const { service, sendEachForMulticast } = montar({
      lista: aparelhos(1234),
    });

    await service.send(payload, { type: 'all' });

    expect(
      sendEachForMulticast.mock.calls.map(([m]) => m.tokens.length),
    ).toEqual([500, 500, 234]);
  });

  it('⚠️ manda só `data` (sem `notification`), com todos os valores string', async () => {
    const { service, sendEachForMulticast } = montar();

    await service.send(payload, { type: 'all' });

    const [mensagem] = sendEachForMulticast.mock.calls[0];
    expect(mensagem.notification).toBeUndefined();
    expect(
      Object.values(mensagem.data).every((v) => typeof v === 'string'),
    ).toBe(true);
    expect(mensagem.data).toMatchObject({
      title: 'Aviso',
      body: 'Corpo',
      url: '/simulados',
      notificationId: 'envio-1',
      tag: 'envio-1',
    });
    expect(mensagem.webpush.headers).toEqual({
      Urgency: 'high',
      TTL: '86400',
    });
  });

  it('⚠️ token morto → aparelho desativado; erro interno do FCM → mantido', async () => {
    const { service, devices } = montar({
      lista: aparelhos(4),
      resposta: () => [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
        {
          success: false,
          error: { code: 'messaging/invalid-registration-token' },
        },
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });

    await service.send(payload, { type: 'all' });

    expect(devices.desativar).toHaveBeenCalledWith(['d1', 'd2']);
  });

  it('⚠️ invalid-argument NÃO apaga (pode ser o payload, e apagaria todos)', async () => {
    const { service, devices } = montar({
      resposta: (tokens) =>
        tokens.map(() => ({
          success: false,
          error: { code: 'messaging/invalid-argument' },
        })),
    });

    await service.send(payload, { type: 'all' });

    expect(devices.desativar).not.toHaveBeenCalled();
  });

  it('contadores e status do registro batem com as respostas', async () => {
    const { service } = montar({
      lista: aparelhos(3, 2),
      resposta: () => [
        { success: true },
        { success: true },
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });

    const envio = await service.send(payload, { type: 'all' }, 'admin-1');

    expect(envio).toMatchObject({
      targetUsers: 2,
      targetDevices: 3,
      successCount: 2,
      failureCount: 1,
      failureReasons: { 'messaging/internal-error': 1 },
      status: StatusDoEnvio.done,
      sentById: 'admin-1',
    });
    expect(envio.finishedAt).toBeInstanceOf(Date);
  });

  it('exceção do FCM → status failed, sem derrubar quem chamou', async () => {
    const { service, sendEachForMulticast } = montar();
    sendEachForMulticast.mockRejectedValueOnce(new Error('rede'));

    const envio = await service.send(payload, { type: 'all' });

    expect(envio.status).toBe(StatusDoEnvio.failed);
  });

  it('iniciarEnvio devolve o registro em `sending` antes de disparar', async () => {
    const { service, sendEachForMulticast } = montar();

    const { envio, disparar } = await service.iniciarEnvio(payload, {
      type: 'all',
    });

    expect(envio.status).toBe(StatusDoEnvio.sending);
    expect(sendEachForMulticast).not.toHaveBeenCalled();
    await disparar();
    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['PUSH_ENABLED=false', { habilitado: false }],
    ['Firebase sem env', { firebaseAtivo: false }],
  ])('%s → 503 e nada é gravado', async (_, opcoes) => {
    const { service, notifications } = montar(opcoes);

    await expect(service.send(payload, { type: 'all' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(notifications.criarComCentral).not.toHaveBeenCalled();
  });

  it('link externo → 400 antes de gravar ou enviar', async () => {
    const { service, notifications, sendEachForMulticast } = montar();

    await expect(
      service.send(
        { ...payload, url: 'https://golpe.example' },
        { type: 'all' },
      ),
    ).rejects.toThrow('link');
    expect(notifications.criarComCentral).not.toHaveBeenCalled();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sendToUsers envia sem gravar histórico', async () => {
    const { service, notifications, devices } = montar();

    const r = await service.sendToUsers(['u0'], payload);

    expect(r).toEqual({ successCount: 3, failureCount: 0, failureReasons: {} });
    expect(devices.ativosDoPublico).toHaveBeenCalledWith({
      type: 'users',
      userIds: ['u0'],
    });
    expect(notifications.criarComCentral).not.toHaveBeenCalled();
  });

  it('⚠️ central: o envio grava TODAS as pessoas do público, com ou sem aparelho', async () => {
    const { service, notifications } = montar({
      lista: aparelhos(1),
      pessoas: ['u0', 'sem-aparelho'],
    });

    const { pessoas } = await service.iniciarEnvio(payload, { type: 'all' });

    expect(pessoas).toBe(2);
    expect(notifications.criarComCentral).toHaveBeenCalledWith(
      expect.objectContaining({ targetUsers: 1, targetDevices: 1 }),
      ['u0', 'sem-aparelho'],
    );
  });

  it('⚠️ ninguém com aparelho mas com conta → não é 422 (vê na central)', async () => {
    const { service } = montar({ lista: [], pessoas: ['u0'] });
    await expect(
      service.iniciarEnvio(payload, { type: 'all' }, undefined, {
        recusarPublicoVazio: true,
      }),
    ).resolves.toMatchObject({ pessoas: 1 });
  });

  it('ninguém com conta → 422 e nada é gravado', async () => {
    const { service, notifications } = montar({ lista: [], pessoas: [] });
    await expect(
      service.iniciarEnvio(payload, { type: 'all' }, undefined, {
        recusarPublicoVazio: true,
      }),
    ).rejects.toThrow('Ninguém nesse público tem conta');
    expect(notifications.criarComCentral).not.toHaveBeenCalled();
  });

  it('alcance: com push e na central', async () => {
    const { service } = montar({
      lista: aparelhos(3, 2),
      pessoas: ['a', 'b', 'c'],
    });
    await expect(service.alcance({ type: 'all' })).resolves.toEqual({
      targetUsers: 2,
      targetDevices: 3,
      pessoas: 3,
    });
  });
});
