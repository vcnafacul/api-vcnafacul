import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InscricaoDoAlunoService } from './inscricao-do-aluno.service';

describe('InscricaoDoAlunoService (026 · 03)', () => {
  const evento = (provas = ['p-en', 'p-es']) => ({
    id: 'e1',
    nome: 'Simulado de outubro',
    descricao: 'Sábado',
    partnerPrepCourseId: 'A',
    partnerPrepCourse: { geo: { name: 'Cursinho A' } },
    inscricoesAte: new Date(),
    provas: provas.map((provaId) => ({ provaId, nomeDaProva: provaId })),
  });

  const montar = () => {
    const eventos = {
      findAbertosDosCursinhos: jest.fn().mockResolvedValue([evento()]),
      findAberto: jest.fn().mockResolvedValue(evento()),
      inscricoesDoAluno: jest.fn().mockResolvedValue([]),
      inscricaoDo: jest.fn().mockResolvedValue(null),
      inserirInscricao: jest.fn(),
      trocarProva: jest.fn(),
      apagarInscricao: jest.fn(),
    };
    const alunos = {
      cursinhosEmQueEstaMatriculado: jest.fn().mockResolvedValue(['A']),
      ehAlunoMatriculadoNo: jest.fn().mockResolvedValue(true),
    };
    const push = { confirmar: jest.fn() };
    // tickets/039: por padrão, cada prova tem um simulado (`s-<prova>`); a
    // `p-dia1` tem dois (Inglês e Espanhol).
    const simulados = {
      dasProvas: jest.fn(
        async (provas: { provaId: string }[]) =>
          new Map(
            provas.map((p) => [
              p.provaId,
              p.provaId === 'p-dia1'
                ? [
                    { simuladoId: 's-ing', nome: 'Dia 1 Inglês' },
                    { simuladoId: 's-esp', nome: 'Dia 1 Espanhol' },
                  ]
                : [{ simuladoId: `s-${p.provaId}`, nome: p.provaId }],
            ]),
          ),
      ),
    };
    return {
      service: new InscricaoDoAlunoService(
        eventos as never,
        alunos as never,
        push as never,
        simulados as never,
      ),
      eventos,
      alunos,
      push,
    };
  };

  it('meus: eventos abertos dos cursinhos em que está matriculado, com a inscrição', async () => {
    const { service, eventos } = montar();
    eventos.inscricoesDoAluno.mockResolvedValue([
      { eventoId: 'e1', provaId: 'p-es' },
    ]);
    const [e] = await service.meus('u1');
    expect(eventos.findAbertosDosCursinhos).toHaveBeenCalledWith(['A']);
    expect(e).toMatchObject({ cursinho: 'Cursinho A', minhaProvaId: 'p-es' });
  });

  it('nova, igual e troca', async () => {
    const { service, eventos } = montar();
    expect((await service.inscrever('u1', 'e1', 'p-en')).resultado).toBe(
      'nova',
    );
    expect(eventos.inserirInscricao).toHaveBeenCalledWith(
      'e1',
      'u1',
      'p-en',
      's-p-en',
    );

    eventos.inscricaoDo.mockResolvedValue({
      id: 'i1',
      provaId: 'p-en',
      simuladoId: 's-p-en',
    });
    expect((await service.inscrever('u1', 'e1', 'p-en')).resultado).toBe(
      'igual',
    );
    expect((await service.inscrever('u1', 'e1', 'p-es')).resultado).toBe(
      'troca',
    );
    expect(eventos.trocarProva).toHaveBeenCalledWith('i1', 'p-es', 's-p-es');
  });

  it('confirma pelo push com o nome da prova e o resultado', async () => {
    const { service, push } = montar();
    await service.inscrever('u1', 'e1', 'p-es');
    expect(push.confirmar).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ id: 'e1' }),
      'p-es',
      'nova',
    );
  });

  it('⚠️ corrida: o UNIQUE barra a segunda e ela vira troca, não erro', async () => {
    const { service, eventos } = montar();
    eventos.inscricaoDo
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'i1', provaId: 'p-en' });
    eventos.inserirInscricao.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    expect((await service.inscrever('u1', 'e1', 'p-es')).resultado).toBe(
      'troca',
    );
  });

  it('uma prova só: sem escolher; várias: tem de escolher uma delas', async () => {
    const { service, eventos } = montar();
    eventos.findAberto.mockResolvedValue(evento(['p-unica']));
    await expect(service.inscrever('u1', 'e1')).resolves.toMatchObject({
      resultado: 'nova',
    });

    eventos.findAberto.mockResolvedValue(evento());
    await expect(service.inscrever('u1', 'e1')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.inscrever('u1', 'e1', 'p-de-fora')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('fora da janela → 404; não matriculado → 403; nada gravado', async () => {
    const { service, eventos, alunos } = montar();
    eventos.findAberto.mockResolvedValue(null);
    await expect(service.inscrever('u1', 'e1', 'p-en')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.desistir('u1', 'e1')).rejects.toThrow(
      NotFoundException,
    );

    eventos.findAberto.mockResolvedValue(evento());
    alunos.ehAlunoMatriculadoNo.mockResolvedValue(false);
    await expect(service.inscrever('u1', 'e1', 'p-en')).rejects.toThrow(
      ForbiddenException,
    );
    expect(alunos.ehAlunoMatriculadoNo).toHaveBeenCalledWith('u1', 'A');
    expect(eventos.inserirInscricao).not.toHaveBeenCalled();
  });

  describe('tickets/039: o aluno escolhe o simulado', () => {
    it('Enem Dia 1 vira duas opções; prova de um simulado, uma com o nome dela', async () => {
      const { service, eventos } = montar();
      eventos.findAbertosDosCursinhos.mockResolvedValue([
        evento(['p-dia1', 'p-dia2']),
      ]);
      const [e] = await service.meus('u1');
      expect(e.opcoes).toEqual([
        { provaId: 'p-dia1', simuladoId: 's-ing', nome: 'Dia 1 Inglês' },
        { provaId: 'p-dia1', simuladoId: 's-esp', nome: 'Dia 1 Espanhol' },
        { provaId: 'p-dia2', simuladoId: 's-p-dia2', nome: 'p-dia2' },
      ]);
      expect(e.meuSimuladoId).toBeNull();
    });

    it('inscreve no simulado; trocar de língua é troca, repetir é igual', async () => {
      const { service, eventos, push } = montar();
      eventos.findAberto.mockResolvedValue(evento(['p-dia1']));
      const r = await service.inscrever('u1', 'e1', undefined, 's-esp');
      expect(r.resultado).toBe('nova');
      expect(r.evento.meuSimuladoId).toBe('s-esp');
      expect(eventos.inserirInscricao).toHaveBeenCalledWith(
        'e1',
        'u1',
        'p-dia1',
        's-esp',
      );
      expect(push.confirmar).toHaveBeenLastCalledWith(
        'u1',
        expect.anything(),
        'Dia 1 Espanhol',
        'nova',
      );

      eventos.inscricaoDo.mockResolvedValue({
        id: 'i1',
        provaId: 'p-dia1',
        simuladoId: 's-esp',
      });
      expect(
        (await service.inscrever('u1', 'e1', 'p-dia1', 's-esp')).resultado,
      ).toBe('igual');
      expect(
        (await service.inscrever('u1', 'e1', 'p-dia1', 's-ing')).resultado,
      ).toBe('troca');
      expect(eventos.trocarProva).toHaveBeenLastCalledWith(
        'i1',
        'p-dia1',
        's-ing',
      );
    });

    it('prova com dois simulados sem dizer qual, ou simulado de fora → 400', async () => {
      const { service, eventos } = montar();
      eventos.findAberto.mockResolvedValue(evento(['p-dia1']));
      await expect(service.inscrever('u1', 'e1', 'p-dia1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.inscrever('u1', 'e1', undefined, 's-de-fora'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.inscrever('u1', 'e1', 'p-outra', 's-ing'),
      ).rejects.toThrow(BadRequestException);
    });

    it('inscrição de antes, sem simulado: vale o único; repetir só completa', async () => {
      const { service, eventos } = montar();
      eventos.inscricoesDoAluno.mockResolvedValue([
        { eventoId: 'e1', provaId: 'p-en', simuladoId: null },
      ]);
      const [e] = await service.meus('u1');
      expect(e.meuSimuladoId).toBe('s-p-en');

      eventos.inscricaoDo.mockResolvedValue({
        id: 'i1',
        provaId: 'p-en',
        simuladoId: null,
      });
      const r = await service.inscrever('u1', 'e1', 'p-en');
      expect(r.resultado).toBe('igual');
      expect(eventos.trocarProva).toHaveBeenCalledWith('i1', 'p-en', 's-p-en');
    });
  });
});
