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
    return {
      service: new InscricaoDoAlunoService(eventos as never, alunos as never),
      eventos,
      alunos,
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
    expect(eventos.inserirInscricao).toHaveBeenCalledWith('e1', 'u1', 'p-en');

    eventos.inscricaoDo.mockResolvedValue({ id: 'i1', provaId: 'p-en' });
    expect((await service.inscrever('u1', 'e1', 'p-en')).resultado).toBe(
      'igual',
    );
    expect((await service.inscrever('u1', 'e1', 'p-es')).resultado).toBe(
      'troca',
    );
    expect(eventos.trocarProva).toHaveBeenCalledWith('i1', 'p-es');
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
});
