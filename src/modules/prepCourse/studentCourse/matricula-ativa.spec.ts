import { HttpException } from '@nestjs/common';
import { StatusApplication } from './enums/stastusApplication';
import { mensagemDeMatriculaAtiva } from './matricula-ativa';
import { StudentCourseService } from './student-course.service';

/**
 * tickets/035 — um usuário tem no máximo UMA matrícula ativa, somando todos os
 * cursinhos. Bloqueia em `confirmEnrolled` e `activeEnrolled`.
 */
describe('mensagemDeMatriculaAtiva', () => {
  const periodo = {
    nome: 'Extensivo',
    ano: 2026,
    inicio: new Date('2026-02-01T12:00:00Z'),
    fim: new Date('2026-11-30T12:00:00Z'),
  };

  it('cita o cursinho e o período letivo da matrícula existente', () => {
    expect(
      mensagemDeMatriculaAtiva('matricular', {
        cursinho: 'Cursinho UFSCar',
        periodo,
      }),
    ).toBe(
      'Não é possível matricular: o estudante já possui matrícula ativa no cursinho Cursinho UFSCar, no período letivo "Extensivo" (2026), de 01/02/2026 a 30/11/2026.',
    );
  });

  it('sem período (matrícula sem turma), a frase para no cursinho', () => {
    expect(
      mensagemDeMatriculaAtiva('reativar a matrícula', {
        cursinho: 'Cursinho UFSCar',
        periodo: null,
      }),
    ).toBe(
      'Não é possível reativar a matrícula: o estudante já possui matrícula ativa no cursinho Cursinho UFSCar.',
    );
  });

  it('cursinho sem nome não vira "null"', () => {
    expect(
      mensagemDeMatriculaAtiva('matricular', { cursinho: null, periodo: null }),
    ).toContain('no cursinho outro cursinho.');
  });

  it('⚠️ a data é lida em UTC — o período é gravado à meia-noite UTC', () => {
    // Em São Paulo, 2025-03-26T00:00Z é 25/03 às 21h: a mensagem erraria o dia.
    const msg = mensagemDeMatriculaAtiva('matricular', {
      cursinho: 'A',
      periodo: {
        ...periodo,
        inicio: new Date('2025-03-26T00:00:00Z'),
        fim: new Date('2025-11-30T00:00:00Z'),
      },
    });
    expect(msg).toContain('de 26/03/2025 a 30/11/2025');
  });
});

describe('StudentCourseService — uma matrícula ativa por usuário', () => {
  const OUTRA = {
    id: 'sc-outro',
    partnerPrepCourse: { geo: { name: 'Cursinho UFSCar' } },
    class: {
      coursePeriod: {
        name: 'Extensivo',
        year: 2026,
        startDate: new Date('2026-02-01T12:00:00Z'),
        endDate: new Date('2026-11-30T12:00:00Z'),
      },
    },
  };

  const montar = (estudante: Record<string, unknown>, outra: unknown) => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({ ...estudante }),
      buscarOutraMatriculaAtiva: jest.fn().mockResolvedValue(outra),
      update: jest.fn().mockResolvedValue(undefined),
      getLastEnrollmentCode: jest.fn().mockResolvedValue(null),
    };
    const inscriptionCourseService = {
      getById: jest.fn().mockResolvedValue({ isTest: false }),
    };
    const classRepository = {
      findOneById: jest.fn().mockResolvedValue({
        id: 't1',
        coursePeriod: { endDate: new Date(Date.now() + 86_400_000) },
      }),
    };
    const logStudentRepository = { create: jest.fn() };
    const cache = { del: jest.fn() };

    // A ordem do construtor do service — só o que estes caminhos usam.
    const deps: unknown[] = new Array(20).fill(undefined);
    deps[0] = repository;
    deps[3] = inscriptionCourseService;
    deps[10] = logStudentRepository;
    deps[14] = classRepository;
    deps[17] = cache;
    const service = new (StudentCourseService as any)(...deps);
    jest.spyOn(service, 'updateClass').mockResolvedValue(undefined);
    return { service, repository, logStudentRepository };
  };

  describe('confirmEnrolled', () => {
    const declarouInteresse = {
      id: 'sc1',
      userId: 'u1',
      applicationStatus: StatusApplication.DeclaredInterest,
      inscriptionCourse: { id: 'ic1' },
    };

    it('com matrícula ativa em outro registro → 400 com cursinho e período', async () => {
      const { service } = montar(declarouInteresse, OUTRA);

      const erro = await service
        .confirmEnrolled('sc1', 't1')
        .catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(HttpException);
      expect((erro as HttpException).getStatus()).toBe(400);
      expect((erro as HttpException).message).toBe(
        'Não é possível matricular: o estudante já possui matrícula ativa no cursinho Cursinho UFSCar, no período letivo "Extensivo" (2026), de 01/02/2026 a 30/11/2026.',
      );
    });

    it('⚠️ bloqueado, nada é gravado — nem número de matrícula, nem log', async () => {
      const { service, repository, logStudentRepository } = montar(
        declarouInteresse,
        OUTRA,
      );

      await service.confirmEnrolled('sc1', 't1').catch(() => undefined);

      expect(repository.getLastEnrollmentCode).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(logStudentRepository.create).not.toHaveBeenCalled();
    });

    it('procura pelo USUÁRIO, ignorando o próprio registro', async () => {
      const { service, repository } = montar(declarouInteresse, null);

      await service.confirmEnrolled('sc1', 't1');

      expect(repository.buscarOutraMatriculaAtiva).toHaveBeenCalledWith(
        'u1',
        'sc1',
      );
    });

    it('sem outra matrícula ativa, matricula normalmente', async () => {
      const { service, repository } = montar(declarouInteresse, null);

      await service.confirmEnrolled('sc1', 't1');

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationStatus: StatusApplication.Enrolled,
          cod_enrolled: expect.any(String),
        }),
      );
    });
  });

  describe('activeEnrolled', () => {
    const cancelada = {
      id: 'sc1',
      userId: 'u1',
      applicationStatus: StatusApplication.EnrollmentCancelled,
    };

    it('com matrícula ativa em outro lugar → 400, e não reativa', async () => {
      const outraSemTurma = { ...OUTRA, class: null };
      const { service, repository } = montar(cancelada, outraSemTurma);

      await expect(service.activeEnrolled('sc1')).rejects.toThrow(
        'Não é possível reativar a matrícula: o estudante já possui matrícula ativa no cursinho Cursinho UFSCar.',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('sem outra matrícula ativa, reativa', async () => {
      const { service, repository } = montar(cancelada, null);

      await service.activeEnrolled('sc1');

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationStatus: StatusApplication.Enrolled,
        }),
      );
    });
  });
});
