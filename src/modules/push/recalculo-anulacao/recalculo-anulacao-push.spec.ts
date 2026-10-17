import { EnvioDoRecalculoTask } from './envio-do-recalculo.task';
import { textoDoRecalculo } from './texto-do-recalculo';

/** tickets/042, card 17. */
describe('push "nota atualizada" (042/17) — texto', () => {
  const base = {
    historicoId: '65ecc850a528b39d273e7901',
    provaNome: 'Simulado 3',
  };
  it('uma anulada × várias; link para o resultado daquela prova', () => {
    expect(textoDoRecalculo({ ...base, quantasAnuladas: 1 })).toEqual({
      title: '📝 Nota atualizada: Simulado 3',
      body: 'Uma questão da prova Simulado 3 foi anulada e sua nota foi atualizada. Acesse a plataforma para mais informações.',
      url: '/dashboard/simulado/aproveitamento/65ecc850a528b39d273e7901',
      tag: 'recalculo-65ecc850a528b39d273e7901',
    });
    expect(textoDoRecalculo({ ...base, quantasAnuladas: 3 }).body).toBe(
      'Questões da prova Simulado 3 foram anuladas e sua nota foi atualizada. Acesse a plataforma para mais informações.',
    );
  });
});

describe('push "nota atualizada" (042/17) — envio calmo', () => {
  const linha = (i: number) => ({
    id: `p${i}`,
    userId: `aluno-${i}`,
    historicoId: `h${i}`,
    provaNome: 'Simulado 3',
    quantasAnuladas: 1,
    tentativas: 0,
  });
  const montar = (n: number, falhar = false) => {
    const fila = {
      destravarEnviando: jest.fn(),
      pendentesVencidos: jest
        .fn()
        .mockResolvedValue(Array.from({ length: n }, (_, i) => linha(i))),
      reservar: jest.fn().mockResolvedValue(true),
      marcarEnviado: jest.fn(),
      reagendar: jest.fn(),
      marcarFalhou: jest.fn(),
      ignorarPendentes: jest.fn(),
    };
    const push = {
      garantirHabilitado: jest.fn(),
      sendToUsers: falhar
        ? jest.fn().mockRejectedValue(new Error('fcm'))
        : jest.fn(),
    };
    const central = { gravar: jest.fn() };
    const task = new EnvioDoRecalculoTask(
      fila as never,
      push as never,
      central as never,
    );
    task.pausa = jest.fn().mockResolvedValue(undefined);
    return { task, fila, push, central };
  };

  it('lote de 20 no ritmo: um push por aluno, pausa entre eles, central gravada', async () => {
    const { task, push, central } = montar(20);
    expect(await task.rodar(new Date())).toBe(20);
    expect(push.sendToUsers).toHaveBeenCalledTimes(20);
    expect(push.sendToUsers.mock.calls[0]).toEqual([
      ['aluno-0'],
      expect.objectContaining({ title: '📝 Nota atualizada: Simulado 3' }),
    ]);
    expect(task.pausa).toHaveBeenCalledTimes(19);
    expect(central.gravar).toHaveBeenCalledTimes(20);
  });

  it('falha no push → reagenda (e não lança: o recálculo já terminou)', async () => {
    const { task, fila } = montar(1, true);
    await expect(task.rodar(new Date('2026-10-17T12:00:00Z'))).resolves.toBe(0);
    expect(fila.reagendar).toHaveBeenCalledWith(
      'p0',
      1,
      new Date('2026-10-17T12:01:00Z'),
    );
  });

  it('fora de prod: tira da fila sem enviar e grava na central', async () => {
    const { task, fila, push, central } = montar(2);
    push.garantirHabilitado.mockImplementation(() => {
      throw new Error('desligado');
    });
    await task.rodar();
    expect(fila.ignorarPendentes).toHaveBeenCalledWith(['p0', 'p1']);
    expect(push.sendToUsers).not.toHaveBeenCalled();
    expect(central.gravar).toHaveBeenCalledTimes(2);
  });
});
