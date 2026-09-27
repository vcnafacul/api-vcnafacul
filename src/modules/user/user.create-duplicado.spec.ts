import { HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { Gender } from './enum/gender';

/**
 * O email repetido comum já é barrado antes, pelo `@EmailUnique` do DTO (400).
 * Este é o caso que sobra: dois cadastros com o mesmo email ao mesmo tempo
 * passam juntos pelo validador, e quem decide é o índice único do banco.
 *
 * ⚠️ O banco é MySQL/MariaDB: o erro chega como `ER_DUP_ENTRY`. O `createUser`
 * procurava o `23505` do Postgres, que nunca chega — a corrida virava 500 e
 * mensagem no Discord, em vez de 409.
 */
describe('UserService.createUser — email duplicado no banco', () => {
  const dto = {
    email: 'maria@x.com',
    password: '12345678',
    password_confirmation: '12345678',
    firstName: 'Maria',
    lastName: 'Silva',
    phone: '11999999999',
    gender: Gender.Female,
    birthday: new Date('2000-01-01'),
    state: 'SP',
    city: 'São Paulo',
    lgpd: true,
  };

  function montar(erroDoBanco: unknown) {
    const userRepository = {
      create: jest.fn().mockRejectedValue(erroDoBanco),
    };
    const roleRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'r1', name: 'aluno' }),
    };
    const discordWebhook = { sendMessage: jest.fn() };
    const envService = { get: jest.fn().mockReturnValue('test') };
    const service = new UserService(
      userRepository as any,
      roleRepository as any,
      {} as any, // jwtService
      {} as any, // emailService
      {} as any, // collaboratorRepository
      {} as any, // collaboratorFrenteRepository
      {} as any, // frenteProxyService
      {} as any, // materiaProxyService
      {} as any, // studentCourseRepository
      discordWebhook as any,
      envService as any,
      {} as any, // cache
      {} as any, // refreshTokenService
      {} as any, // profileDetector
      {} as any, // pushService
    );
    return { service };
  }

  it('⚠️ ER_DUP_ENTRY vira 409 "Email já cadastrado"', async () => {
    const { service } = montar({ code: 'ER_DUP_ENTRY', errno: 1062 });

    const erro = await service.createUser(dto as any).catch((e) => e);

    expect(erro).toBeInstanceOf(HttpException);
    expect(erro.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(erro.message).toBe('Email já cadastrado');
  });

  it('outro erro do banco continua subindo como veio', async () => {
    const outro = { code: 'ER_LOCK_DEADLOCK' };
    const { service } = montar(outro);

    await expect(service.createUser(dto as any)).rejects.toBe(outro);
  });
});
