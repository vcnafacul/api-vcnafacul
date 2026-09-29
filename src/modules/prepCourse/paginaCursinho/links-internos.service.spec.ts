import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TipoDeLink } from '../partnerPrepCourse/pagina/cursinho-link.entity';
import { LinksInternosService } from './links-internos.service';

describe('LinksInternosService (025 · 05)', () => {
  const pagina = {
    active: true,
    partnerPrepCourseId: 'A',
    links: [
      { tipo: TipoDeLink.Publico, titulo: 'Site', url: 'https://a' },
      { tipo: TipoDeLink.Interno, titulo: 'Drive', url: 'https://drive' },
    ],
  };
  const montar = (
    colaborador: boolean,
    aluno: boolean,
    p: unknown = pagina,
  ) => {
    const paginas = { findBySlug: jest.fn().mockResolvedValue(p) };
    const colaboradores = {
      ehColaboradorAtivoDo: jest.fn().mockResolvedValue(colaborador),
    };
    const alunos = { ehAlunoMatriculadoNo: jest.fn().mockResolvedValue(aluno) };
    return {
      service: new LinksInternosService(
        paginas as never,
        colaboradores as never,
        alunos as never,
      ),
      colaboradores,
      alunos,
    };
  };

  it.each([
    ['colaborador ativo', true, false],
    ['aluno matriculado', false, true],
  ])('%s do cursinho → só os internos', async (_n, colab, aluno) => {
    const { service, colaboradores, alunos } = montar(colab, aluno);
    await expect(service.doSlug('meu', 'u1')).resolves.toEqual([
      { titulo: 'Drive', url: 'https://drive' },
    ]);
    // ⚠️ o vínculo é checado contra o cursinho DA PÁGINA
    expect(colaboradores.ehColaboradorAtivoDo).toHaveBeenCalledWith('u1', 'A');
    expect(alunos.ehAlunoMatriculadoNo).toHaveBeenCalledWith('u1', 'A');
  });

  it('sem vínculo → 403', async () => {
    const { service } = montar(false, false);
    await expect(service.doSlug('meu', 'u1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('página desativada ou inexistente → 404', async () => {
    for (const p of [null, { ...pagina, active: false }]) {
      const { service } = montar(true, true, p);
      await expect(service.doSlug('meu', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    }
  });
});
