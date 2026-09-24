import { HttpException } from '@nestjs/common';
import { StatusDoConvite } from './convite-colaborador.entity';
import { hashDoToken } from './convite-colaborador.regras';
import { ConviteColaboradorService } from './convite-colaborador.service';

const CURSINHO = { id: 'c1', geo: { name: 'Cursinho Popular' } };
const FUNCAO = { id: 'r1', name: 'Professor', partnerPrepCourse: { id: 'c1' } };
const EM_7_DIAS = () => new Date(Date.now() + 7 * 864e5);

const montar = (
  opcoes: {
    usuario?: unknown;
    colaborador?: unknown;
    funcao?: unknown;
    vigente?: unknown;
    convite?: unknown;
    erroAoSalvar?: unknown;
  } = {},
) => {
  const salvos: any[] = [];
  const repoTx = {
    update: jest.fn(),
    findOne: jest.fn().mockResolvedValue(opcoes.vigente ?? null),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => {
      if (opcoes.erroAoSalvar) throw opcoes.erroAoSalvar;
      const salvo = { ...x, id: 'cv1', createdAt: new Date() };
      salvos.push(salvo);
      return salvo;
    }),
  };
  const repo = {
    findOne: jest.fn().mockResolvedValue(opcoes.convite ?? null),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  };
  const dataSource = {
    getRepository: () => repo,
    transaction: jest.fn(async (fn) => fn({ getRepository: () => repoTx })),
  };
  const userService = {
    findOneBy: jest.fn(async (where: { id?: string; email?: string }) =>
      where.id
        ? { id: where.id, firstName: 'Carla', lastName: 'Admin' }
        : (opcoes.usuario ?? null),
    ),
  };
  const emailService = { sendConviteColaborador: jest.fn() };
  const service = new ConviteColaboradorService(
    dataSource as any,
    { findOneByUserId: jest.fn().mockResolvedValue(CURSINHO) } as any,
    userService as any,
    {
      findOneByUserId: jest.fn().mockResolvedValue(opcoes.colaborador ?? null),
    } as any,
    {
      findOneByIdWithPartner: jest
        .fn()
        .mockResolvedValue(
          opcoes.funcao === undefined ? FUNCAO : opcoes.funcao,
        ),
    } as any,
    emailService as any,
    { create: jest.fn() } as any,
  );
  return { service, repoTx, repo, emailService, salvos };
};

const erroDe = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e) => e as HttpException,
  );

describe('ConviteColaboradorService.criar', () => {
  it('cria pendente por 7 dias, com o email normalizado, e manda o email', async () => {
    const { service, salvos, emailService } = montar();

    const saida = await service.criar('gestor', '  Ana@X.com ', 'r1');

    expect(salvos[0]).toMatchObject({
      email: 'ana@x.com',
      partnerPrepCourseId: 'c1',
      roleId: 'r1',
      convidadoPorId: 'gestor',
      status: StatusDoConvite.pendente,
    });
    expect(saida.situacao).toBe('pendente');
    expect(emailService.sendConviteColaborador).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@x.com',
        temConta: false,
        funcao: 'Professor',
      }),
    );
  });

  it('⚠️ grava o HASH do token — e o token do email é o que gera esse hash', async () => {
    const { service, salvos, emailService } = montar();

    await service.criar('gestor', 'ana@x.com', 'r1');

    const { token } = emailService.sendConviteColaborador.mock.calls[0][0];
    expect(salvos[0].tokenHash).toBe(hashDoToken(token));
    expect(salvos[0].tokenHash).not.toBe(token);
  });

  it('quem já tem conta recebe o texto de aceitar', async () => {
    const { service, emailService } = montar({
      usuario: { id: 'u-ana', firstName: 'Ana' },
    });

    await service.criar('gestor', 'ana@x.com', 'r1');

    expect(emailService.sendConviteColaborador).toHaveBeenCalledWith(
      expect.objectContaining({ temConta: true, nome: 'Ana' }),
    );
  });

  it('⚠️ já há convite válido: 409 com a data, e não envia', async () => {
    const { service, emailService } = montar({
      vigente: { expiraEm: new Date('2026-10-01T15:00:00Z') },
    });

    const erro = await erroDe(service.criar('gestor', 'ana@x.com', 'r1'));

    expect(erro?.getStatus()).toBe(409);
    expect(erro?.message).toBe(
      'Já existe um convite pendente para este email, válido até 01/10.',
    );
    expect(emailService.sendConviteColaborador).not.toHaveBeenCalled();
  });

  it('⚠️ o vencido é marcado expirado ANTES de procurar o vigente — libera a chave', async () => {
    const { service, repoTx } = montar();

    await service.criar('gestor', 'ana@x.com', 'r1');

    expect(repoTx.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@x.com',
        status: StatusDoConvite.pendente,
      }),
      { status: StatusDoConvite.expirado },
    );
    expect(repoTx.update.mock.invocationCallOrder[0]).toBeLessThan(
      repoTx.findOne.mock.invocationCallOrder[0],
    );
  });

  it('⚠️ a corrida que passa pela checagem: o índice único vira o mesmo 409', async () => {
    const { service } = montar({ erroAoSalvar: { code: 'ER_DUP_ENTRY' } });

    const erro = await erroDe(service.criar('gestor', 'ana@x.com', 'r1'));

    expect(erro?.getStatus()).toBe(409);
  });

  it('já é colaboradora DESTE cursinho: 409', async () => {
    const { service } = montar({
      usuario: { id: 'u-ana' },
      colaborador: { partnerPrepCourse: { id: 'c1' } },
    });

    const erro = await erroDe(service.criar('gestor', 'ana@x.com', 'r1'));

    expect(erro?.message).toBe('Esta pessoa já é colaboradora deste cursinho.');
  });

  it('⚠️ vinculada a OUTRO cursinho: 409 — "outro cursinho = Não"', async () => {
    const { service } = montar({
      usuario: { id: 'u-ana' },
      colaborador: { partnerPrepCourse: { id: 'c2' }, actived: false },
    });

    const erro = await erroDe(service.criar('gestor', 'ana@x.com', 'r1'));

    expect(erro?.message).toBe(
      'Esta pessoa já está vinculada a outro cursinho e não pode ser convidada no momento.',
    );
  });

  it('⚠️ função de outro cursinho ou da plataforma: 400', async () => {
    for (const funcao of [
      { ...FUNCAO, partnerPrepCourse: { id: 'c2' } },
      { ...FUNCAO, partnerPrepCourse: null },
      null,
    ]) {
      const { service } = montar({ funcao });

      const erro = await erroDe(service.criar('gestor', 'ana@x.com', 'r1'));

      expect(erro?.getStatus()).toBe(400);
    }
  });
});

describe('ConviteColaboradorService — pendente', () => {
  const pendente = () => ({
    id: 'cv1',
    email: 'ana@x.com',
    partnerPrepCourseId: 'c1',
    status: StatusDoConvite.pendente,
    tokenHash: 'hash-antigo',
    expiraEm: EM_7_DIAS(),
    role: FUNCAO,
    convidadoPor: { firstName: 'Carla', lastName: 'Admin' },
  });

  it('⚠️ reenviar gera token NOVO — o hash antigo sai, o link anterior morre', async () => {
    const { service, repo, emailService } = montar({ convite: pendente() });

    await service.reenviar('gestor', 'cv1');

    const [, atualizacao] = repo.update.mock.calls[0];
    const { token } = emailService.sendConviteColaborador.mock.calls[0][0];
    expect(atualizacao.tokenHash).not.toBe('hash-antigo');
    expect(atualizacao.tokenHash).toBe(hashDoToken(token));
  });

  it('cancelar marca cancelado', async () => {
    const { service, repo } = montar({ convite: pendente() });

    await service.cancelar('gestor', 'cv1');

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'cv1' },
      { status: StatusDoConvite.cancelado },
    );
  });

  it('trocar a função exige função do cursinho', async () => {
    const { service } = montar({
      convite: pendente(),
      funcao: { ...FUNCAO, partnerPrepCourse: { id: 'c2' } },
    });

    const erro = await erroDe(service.trocarFuncao('gestor', 'cv1', 'r2'));

    expect(erro?.getStatus()).toBe(400);
  });

  it('⚠️ convite vencido não se reenvia, cancela nem troca: 400', async () => {
    const { service } = montar({
      convite: { ...pendente(), expiraEm: new Date(Date.now() - 1000) },
    });

    for (const acao of [
      service.reenviar('gestor', 'cv1'),
      service.cancelar('gestor', 'cv1'),
      service.trocarFuncao('gestor', 'cv1', 'r1'),
    ]) {
      expect((await erroDe(acao))?.getStatus()).toBe(400);
    }
  });

  it('convite de outro cursinho: 404', async () => {
    const { service } = montar({ convite: null });

    expect((await erroDe(service.cancelar('gestor', 'cv9')))?.getStatus()).toBe(
      404,
    );
  });
});
