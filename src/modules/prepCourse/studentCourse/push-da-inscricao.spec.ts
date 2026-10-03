import { ServiceUnavailableException } from '@nestjs/common';
import {
  PushDaInscricaoService,
  textoDaInscricao,
} from './push-da-inscricao.service';

describe('push da inscrição no processo seletivo (docs · 01)', () => {
  describe('textoDaInscricao', () => {
    it('cita o cursinho e leva ao acompanhamento das inscrições', () => {
      expect(textoDaInscricao('Cursinho A', 'sc1')).toEqual({
        title: '✅ Inscrição recebida: Cursinho A',
        body: 'Sua inscrição foi feita com sucesso. Enviamos para o seu email uma cópia do formulário preenchido.',
        url: '/dashboard/acompanhamento-inscricoes',
        tag: 'inscricao-processo-sc1',
      });
    });

    it('título longo é cortado nos 100 caracteres', () => {
      const t = textoDaInscricao('x'.repeat(200), 'sc1');
      expect(t.title.length).toBeLessThanOrEqual(100);
      expect(t.title.endsWith('…')).toBe(true);
    });

    it('sem nome do cursinho não fica "undefined"', () => {
      expect(textoDaInscricao(undefined, 'sc1').title).toBe(
        '✅ Inscrição recebida: Cursinho',
      );
    });
  });

  describe('PushDaInscricaoService', () => {
    const montar = ({
      habilitado = true,
      sendToUsers = jest.fn().mockResolvedValue({}),
      gravar = jest.fn().mockResolvedValue(undefined),
    } = {}) => {
      const push = {
        sendToUsers,
        garantirHabilitado: jest.fn(() => {
          if (!habilitado)
            throw new ServiceUnavailableException('push desligado');
        }),
      };
      const central = { gravar };
      return {
        service: new PushDaInscricaoService(push as never, central as never),
        push,
        central,
      };
    };

    it('manda o push e grava na central do próprio estudante', async () => {
      const { service, push, central } = montar();
      await service.avisar('u1', 'Cursinho A', 'sc1');
      expect(push.sendToUsers).toHaveBeenCalledWith(
        ['u1'],
        textoDaInscricao('Cursinho A', 'sc1'),
      );
      expect(central.gravar).toHaveBeenCalledWith(['u1'], {
        titulo: '✅ Inscrição recebida: Cursinho A',
        corpo: expect.any(String),
        url: '/dashboard/acompanhamento-inscricoes',
      });
    });

    it('push desligado no ambiente: não tenta enviar, mas grava na central', async () => {
      const { service, push, central } = montar({ habilitado: false });
      await expect(service.avisar('u1', 'A', 'sc1')).resolves.toBeUndefined();
      expect(push.sendToUsers).not.toHaveBeenCalled();
      expect(central.gravar).toHaveBeenCalled();
    });

    it('push falhou: não lança (a inscrição segue) e a central grava', async () => {
      const { service, central } = montar({
        sendToUsers: jest.fn().mockRejectedValue(new Error('FCM fora')),
      });
      await expect(service.avisar('u1', 'A', 'sc1')).resolves.toBeUndefined();
      expect(central.gravar).toHaveBeenCalled();
    });

    it('central falhou: não lança e o push sai mesmo assim', async () => {
      const { service, push } = montar({
        gravar: jest.fn().mockRejectedValue(new Error('MySQL fora')),
      });
      await expect(service.avisar('u1', 'A', 'sc1')).resolves.toBeUndefined();
      expect(push.sendToUsers).toHaveBeenCalled();
    });
  });
});
