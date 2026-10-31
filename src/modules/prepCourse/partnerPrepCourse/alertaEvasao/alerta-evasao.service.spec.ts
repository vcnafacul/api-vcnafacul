import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AlertaEvasaoService } from './alerta-evasao.service';
import { SalvarAlertaEvasaoDtoInput } from './dtos/alerta-evasao.dto';

describe('AlertaEvasaoService (tickets/054, card 01)', () => {
  const repository = { salvarAlertaEvasao: jest.fn() };
  const collaboratorRepository = { findOneByUserId: jest.fn() };
  const service = new AlertaEvasaoService(
    repository as any,
    collaboratorRepository as any,
  );

  const colaboradorDe = (cursinho: object, actived = true) =>
    collaboratorRepository.findOneByUserId.mockResolvedValue({
      actived,
      partnerPrepCourse: cursinho,
    });

  beforeEach(() => jest.clearAllMocks());

  it('cursinho que nunca configurou: desligado, 10 aulas', async () => {
    colaboradorDe({
      id: 'c1',
      alertaEvasaoPercentual: null,
      alertaEvasaoMinimoAulas: 10,
    });
    await expect(service.obter('u1')).resolves.toEqual({
      percentual: null,
      minimoDeAulas: 10,
    });
  });

  it('⚠️ salva no cursinho do colaborador logado, nunca em outro', async () => {
    colaboradorDe({ id: 'c1' });
    await service.salvar('u1', { percentual: 15, minimoDeAulas: 12 });
    expect(collaboratorRepository.findOneByUserId).toHaveBeenCalledWith('u1');
    expect(repository.salvarAlertaEvasao).toHaveBeenCalledWith('c1', {
      alertaEvasaoPercentual: 15,
      alertaEvasaoMinimoAulas: 12,
    });
  });

  it('percentual null desliga', async () => {
    colaboradorDe({ id: 'c1' });
    await expect(
      service.salvar('u1', { percentual: null, minimoDeAulas: 10 }),
    ).resolves.toEqual({ percentual: null, minimoDeAulas: 10 });
    expect(repository.salvarAlertaEvasao).toHaveBeenCalledWith('c1', {
      alertaEvasaoPercentual: null,
      alertaEvasaoMinimoAulas: 10,
    });
  });

  it.each([
    ['sem colaborador', null],
    [
      'colaborador desligado',
      { actived: false, partnerPrepCourse: { id: 'c1' } },
    ],
    ['colaborador sem cursinho', { actived: true, partnerPrepCourse: null }],
  ])('%s → 403 e nada é gravado', async (_, colaborador) => {
    collaboratorRepository.findOneByUserId.mockResolvedValue(colaborador);
    await expect(
      service.salvar('u1', { percentual: 15, minimoDeAulas: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.salvarAlertaEvasao).not.toHaveBeenCalled();
  });
});

describe('SalvarAlertaEvasaoDtoInput', () => {
  const erros = (corpo: object) =>
    validateSync(plainToInstance(SalvarAlertaEvasaoDtoInput, corpo)).map(
      (e) => e.property,
    );

  it.each([
    [{ percentual: 15, minimoDeAulas: 10 }],
    [{ percentual: null, minimoDeAulas: 10 }],
    [{ percentual: 1, minimoDeAulas: 1 }],
    [{ percentual: 100, minimoDeAulas: 200 }],
  ])('aceita %j', (corpo) => expect(erros(corpo)).toEqual([]));

  it.each([
    [{ percentual: 0, minimoDeAulas: 10 }, 'percentual'],
    [{ percentual: 101, minimoDeAulas: 10 }, 'percentual'],
    [{ percentual: 2.5, minimoDeAulas: 10 }, 'percentual'],
    [{ percentual: '15', minimoDeAulas: 10 }, 'percentual'],
    [{ percentual: 15, minimoDeAulas: 0 }, 'minimoDeAulas'],
    [{ percentual: 15, minimoDeAulas: 201 }, 'minimoDeAulas'],
    [{ percentual: 15 }, 'minimoDeAulas'],
  ])('recusa %j (%s)', (corpo, campo) => expect(erros(corpo)).toEqual([campo]));
});
