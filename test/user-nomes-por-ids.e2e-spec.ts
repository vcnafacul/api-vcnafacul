import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/** tickets/048, card 06: nomes de exibição em lote, com nome social. */
describe('UserService#findNomesPorIds (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiscordWebhook)
      .useValue({ sendMessage: jest.fn() })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = createNestAppTest(moduleFixture);
    await app.init();
    userService = moduleFixture.get(UserService);
    userRepository = moduleFixture.get(UserRepository);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const criar = async (extra: Record<string, unknown>) => {
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `c06-${randomUUID()}@teste.com`,
      ...extra,
    };
    await userService.create(dto as never);
    return userRepository.findOneBy({ email: dto.email });
  };

  it('devolve o nome de cada id, com nome social quando usa, e ignora id desconhecido', async () => {
    const ana = await criar({ firstName: 'Ana', lastName: 'Souza' });
    const bia = await criar({ firstName: 'Beatriz', lastName: 'Lima' });
    bia.socialName = 'Bia';
    bia.useSocialName = true;
    await userRepository.update(bia);

    const nomes = await userService.findNomesPorIds([
      ana.id,
      bia.id,
      ana.id,
      'nao-existe',
      '',
    ]);

    expect(nomes.get(ana.id)).toBe('Ana Souza');
    expect(nomes.get(bia.id)).toBe('Bia Lima');
    expect(nomes.has('nao-existe')).toBe(false);
    expect(nomes.size).toBe(2);
  });

  it('lista vazia não consulta o banco', async () => {
    const spy = jest.spyOn(userRepository, 'findNomesPorIds');
    expect((await userService.findNomesPorIds([])).size).toBe(0);
    expect(spy).toHaveBeenCalledWith([]);
  });
});
