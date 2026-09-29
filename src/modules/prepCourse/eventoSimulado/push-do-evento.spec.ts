import { AvisoDeAberturaTask } from './aviso-de-abertura.task';
import {
  PushDoEventoService,
  textoDaAbertura,
  textoDaConfirmacao,
} from './push-do-evento.service';

const evento = {
  id: 'e1',
  nome: 'Simulado de outubro',
  partnerPrepCourseId: 'A',
  partnerPrepCourse: { geo: { name: 'Cursinho A' } },
} as never;

describe('push do evento (026 · 04)', () => {
  describe('textos', () => {
    it('abertura cita o cursinho e leva ao dashboard', () => {
      expect(textoDaAbertura(evento)).toMatchObject({
        title: '📝 Inscrições abertas: Simulado de outubro',
        body: 'Cursinho A tem um simulado programado. Toque para se inscrever.',
        url: '/dashboard',
      });
    });

    it('nova confirma, troca avisa a prova nova, igual não manda nada', () => {
      expect(textoDaConfirmacao(evento, 'Inglês', 'nova')).toMatchObject({
        title: '✅ Inscrição confirmada',
        body: 'Simulado de outubro — Inglês.',
      });
      expect(textoDaConfirmacao(evento, 'Espanhol', 'troca')?.body).toBe(
        'Agora você está inscrito em Espanhol (Simulado de outubro).',
      );
      expect(textoDaConfirmacao(evento, 'Inglês', 'igual')).toBeNull();
    });

    it('título longo é cortado nos 100 caracteres', () => {
      const t = textoDaAbertura({
        ...(evento as object),
        nome: 'x'.repeat(200),
      } as never);
      expect(t.title.length).toBeLessThanOrEqual(100);
    });
  });

  describe('PushDoEventoService', () => {
    const montar = (sendToUsers = jest.fn()) => {
      const push = { sendToUsers, garantirHabilitado: jest.fn() };
      const alunos = {
        alunosMatriculadosNo: jest.fn().mockResolvedValue(['u1', 'u2']),
      };
      return {
        service: new PushDoEventoService(push as never, alunos as never),
        push,
        alunos,
      };
    };

    it('abertura vai para os matriculados do cursinho do evento', async () => {
      const { service, push, alunos } = montar();
      await service.avisarAbertura(evento);
      expect(alunos.alunosMatriculadosNo).toHaveBeenCalledWith('A');
      expect(push.sendToUsers.mock.calls[0][0]).toEqual(['u1', 'u2']);
    });

    it('⚠️ falha no envio (ex.: push desligado, 503) não derruba nada', async () => {
      const { service } = montar(jest.fn().mockRejectedValue(new Error('503')));
      await expect(service.avisarAbertura(evento)).resolves.toBeUndefined();
      await expect(
        service.confirmar('u1', evento, 'Inglês', 'nova'),
      ).resolves.toBeUndefined();
    });

    it('confirmação "igual" nem chama o push', async () => {
      const { service, push } = montar();
      await service.confirmar('u1', evento, 'Inglês', 'igual');
      expect(push.sendToUsers).not.toHaveBeenCalled();
    });

    it('habilitado() reflete o garantirHabilitado', () => {
      const { service, push } = montar();
      expect(service.habilitado()).toBe(true);
      push.garantirHabilitado.mockImplementation(() => {
        throw new Error('off');
      });
      expect(service.habilitado()).toBe(false);
    });
  });

  describe('AvisoDeAberturaTask', () => {
    const montar = (habilitado = true, reserva = true) => {
      const eventos = {
        findParaAvisar: jest.fn().mockResolvedValue([evento]),
        reservarAviso: jest.fn().mockResolvedValue(reserva),
      };
      const push = {
        habilitado: jest.fn().mockReturnValue(habilitado),
        avisarAbertura: jest.fn(),
      };
      return {
        task: new AvisoDeAberturaTask(eventos as never, push as never),
        eventos,
        push,
      };
    };

    it('reserva e avisa', async () => {
      const { task, push } = montar();
      expect(await task.avisar()).toBe(1);
      expect(push.avisarAbertura).toHaveBeenCalledWith(evento);
    });

    it('⚠️ push desligado: nem reserva (senão marcaria como enviado sem ter saído)', async () => {
      const { task, eventos, push } = montar(false);
      expect(await task.avisar()).toBe(0);
      expect(eventos.reservarAviso).not.toHaveBeenCalled();
      expect(push.avisarAbertura).not.toHaveBeenCalled();
    });

    it('outra rodada já reservou: não avisa de novo', async () => {
      const { task, push } = montar(true, false);
      expect(await task.avisar()).toBe(0);
      expect(push.avisarAbertura).not.toHaveBeenCalled();
    });
  });
});
