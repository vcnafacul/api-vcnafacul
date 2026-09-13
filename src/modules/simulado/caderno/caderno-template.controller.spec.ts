import { BadRequestException } from '@nestjs/common';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CadernoTemplateController } from './caderno-template.controller';

const usuario = { id: 'user-1' };
const req = () => ({ user: usuario }) as any;
const res = () => ({ setHeader: jest.fn(), send: jest.fn() }) as any;

function montar(over: Record<string, unknown> = {}) {
  const http = {
    publicada: jest.fn().mockResolvedValue({ versao: 3 }),
    rascunho: jest.fn().mockResolvedValue({ versao: 0 }),
    versoes: jest.fn().mockResolvedValue([]),
    descartarRascunho: jest.fn().mockResolvedValue(undefined),
    publicar: jest.fn().mockResolvedValue({ versao: 4 }),
    restaurar: jest.fn().mockResolvedValue(undefined),
    subirRascunho: jest.fn().mockResolvedValue({ erros: [] }),
    zipDeTeste: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
    }),
    ...over,
  } as any;
  const audit = { create: jest.fn().mockResolvedValue(undefined) };
  return {
    http,
    audit,
    controller: new CadernoTemplateController(http, audit as any),
  };
}

describe('as rotas e os guards', () => {
  it('o controller vive sob mssimulado/caderno/template', () => {
    // ⚠️ O card 13 monta as chamadas em cima deste caminho. Divergir aqui
    // quebra um repo que ainda não existe, e o erro aparece só na integração.
    expect(Reflect.getMetadata('path', CadernoTemplateController)).toBe(
      'mssimulado/caderno/template',
    );
  });

  it.each([
    'publicada',
    'getRascunho',
    'subirRascunho',
    'descartarRascunho',
    'publicar',
    'versoes',
    'restaurar',
    'zipDeTeste',
  ])('%s exige alterarPermissao', (metodo) => {
    const permissao = Reflect.getMetadata(
      PermissionsGuard.name,
      CadernoTemplateController.prototype[metodo],
    );
    expect(permissao).toBe(Permissions.alterarPermissao);
  });
});

describe('os query params do /teste NÃO chegam crus no ms', () => {
  // ⚠️ A api repete a validação do ms de propósito. Se ela montasse o literal
  // sem interpretar, `?rascunho=xis` viraria "sim" em silêncio e o 400 do ms
  // nunca dispararia — o defeito que o ms existe para evitar, reintroduzido
  // uma camada acima. A spec tem a tabela.

  it('sem parâmetro, pede a publicada', async () => {
    const { http, controller } = montar();
    await controller.zipDeTeste(undefined, undefined, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({});
  });

  it('?versao=3 vira o NÚMERO 3', async () => {
    const { http, controller } = montar();
    await controller.zipDeTeste('3', undefined, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({ versao: 3 });
  });

  it.each(['1', 'true'])('?rascunho=%s vira booleano', async (valor) => {
    const { http, controller } = montar();
    await controller.zipDeTeste(undefined, valor, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({ rascunho: true });
  });

  it.each(['xis', 'false', '0', ''])(
    '?rascunho=%s → 400 SEM chamar o ms',
    async (valor) => {
      const { http, controller } = montar();
      await expect(
        controller.zipDeTeste(undefined, valor, res()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(http.zipDeTeste).not.toHaveBeenCalled();
    },
  );

  it.each(['abc', '', '1.5', '-1'])(
    '?versao=%s → 400 SEM chamar o ms',
    async (valor) => {
      const { http, controller } = montar();
      await expect(
        controller.zipDeTeste(valor, undefined, res()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(http.zipDeTeste).not.toHaveBeenCalled();
    },
  );

  it('os dois juntos → 400 SEM chamar o ms', async () => {
    const { http, controller } = montar();
    await expect(controller.zipDeTeste('3', '1', res())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(http.zipDeTeste).not.toHaveBeenCalled();
  });
});

describe('o criadorId vem do JWT, nunca do cliente', () => {
  it('subirRascunho usa req.user.id', async () => {
    const { http, controller } = montar();
    const arquivo = { buffer: Buffer.from('z'), originalname: 'p.zip' } as any;
    await controller.subirRascunho(arquivo, { notas: 'x' } as any, req());
    expect(http.subirRascunho).toHaveBeenCalledWith(arquivo, 'user-1', 'x');
  });

  it('restaurar usa req.user.id, e NÃO manda notas', async () => {
    // ⚠️ O ms ignora `notas` no restaurar de propósito. Aceitar o campo aqui
    // daria ao coordenador um texto que some sem erro.
    const { http, controller } = montar();
    await controller.restaurar(2, req());
    expect(http.restaurar).toHaveBeenCalledWith(2, 'user-1');
  });

  it('subirRascunho sem arquivo → 400, sem chamar o ms', async () => {
    const { http, controller } = montar();
    await expect(
      controller.subirRascunho(undefined as any, {} as any, req()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(http.subirRascunho).not.toHaveBeenCalled();
  });
});

describe('a auditoria', () => {
  it('publicar grava DEPOIS do sucesso, com autor e versão', async () => {
    const { audit, controller } = montar();
    await controller.publicar(req());

    expect(audit.create).toHaveBeenCalledWith({
      entityType: 'caderno-template',
      entityId: '4',
      updatedBy: 'user-1',
      changes: { acao: 'publicar', versao: 4 },
    });
  });

  it('publicar que FALHA no ms não grava nada', async () => {
    // ⚠️ Um log de "publicou a v5" para uma publicação que o ms recusou com
    // 409 é pior que log nenhum: manda procurar uma versão que não existe.
    const { audit, controller } = montar({
      publicar: jest.fn().mockRejectedValue(new Error('409')),
    });
    await expect(controller.publicar(req())).rejects.toThrow();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('restaurar grava, com a versão de origem', async () => {
    const { audit, controller } = montar();
    await controller.restaurar(2, req());
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'caderno-template',
        entityId: '2',
        updatedBy: 'user-1',
        changes: { acao: 'restaurar', versao: 2 },
      }),
    );
  });

  it('as rotas de LEITURA não gravam nada', async () => {
    const { audit, controller } = montar();
    await controller.publicada();
    await controller.versoes();
    await controller.zipDeTeste(undefined, undefined, res());
    expect(audit.create).not.toHaveBeenCalled();
  });
});

describe('o binário', () => {
  it('manda o zip com Content-Disposition', async () => {
    const { controller } = montar();
    const resposta = res();
    await controller.zipDeTeste(undefined, undefined, resposta);

    expect(resposta.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    const disposition = resposta.setHeader.mock.calls.find(
      ([nome]) => nome === 'Content-Disposition',
    );
    expect(disposition[1]).toContain('attachment');
    expect(resposta.send).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });
});
