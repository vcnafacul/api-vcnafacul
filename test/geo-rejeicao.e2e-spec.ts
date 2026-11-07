import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { AppModule } from 'src/app.module';
import { MotivoRejeicaoGeo } from 'src/modules/geo/enum/motivo-rejeicao';
import { TypeGeo } from 'src/modules/geo/enum/typeGeo';
import { Geolocation } from 'src/modules/geo/geo.entity';
import { LogGeo } from 'src/modules/geo/log-geo/log-geo.entity';
import { Role } from 'src/modules/role/role.entity';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

jest.mock('src/shared/services/webhooks/discord.ts');
jest.mock('src/shared/services/email/email.service');

/** Motivo da rejeição no dash do Localiza (`PATCH /geo`). */
describe('PATCH /geo — motivo da rejeição (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let auth: string;
  const criados: string[] = [];

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
    dataSource = moduleFixture.get(DataSource);

    const userService = moduleFixture.get(UserService);
    const userRepository = moduleFixture.get(UserRepository);
    const dto = {
      ...CreateUserDtoInputFaker(),
      email: `geo-rejeicao-${randomUUID()}@teste.com`,
    };
    await userService.create(dto);
    const u = await userRepository.findOneBy({ email: dto.email });
    u.role = await dataSource
      .getRepository(Role)
      .save({ name: `geo-${randomUUID().slice(0, 8)}`, validarCursinho: true });
    await userRepository.update(u);
    auth = `Bearer ${await moduleFixture
      .get(JwtService)
      .signAsync({ user: { id: u.id } })}`;
  });

  afterAll(async () => {
    if (criados.length) {
      await dataSource.query('DELETE FROM log_geo WHERE geo_id IN (?)', [
        criados,
      ]);
      await dataSource.query('DELETE FROM geolocations WHERE id IN (?)', [
        criados,
      ]);
    }
    if (app) await app.close();
  });

  const novoGeo = async () => {
    const geo = await dataSource.getRepository(Geolocation).save(
      Object.assign(new Geolocation(), {
        name: `Cursinho ${randomUUID().slice(0, 8)}`,
        latitude: -22.9,
        longitude: -47.06,
        cep: '13000-000',
        state: 'SP',
        city: 'Campinas',
        neighborhood: 'Centro',
        street: 'Rua A',
        userFullName: 'Quem Cadastrou',
        userPhone: '11999990000',
        userConnection: 'Coordenadora',
        userEmail: 'quem.cadastrou@exemplo.com',
        status: Status.Pending,
        type: TypeGeo.PREP_COURSE,
      }),
    );
    criados.push(geo.id);
    return geo;
  };

  const patch = (body: object) =>
    request(app.getHttpServer())
      .patch('/geo')
      .set('Authorization', auth)
      .send(body);

  const ultimoLog = async (geoId: string) =>
    (
      await dataSource
        .getRepository(LogGeo)
        .find({ where: { geoId }, order: { createdAt: 'DESC' } })
    )[0]?.description;

  it('rejeitar sem motivo → 400, e o status não muda', async () => {
    const geo = await novoGeo();
    await patch({ geoId: geo.id, status: Status.Rejected }).expect(400);
    const salvo = await dataSource
      .getRepository(Geolocation)
      .findOneBy({ id: geo.id });
    expect(salvo.status).toBe(Status.Pending);
  });

  it('motivo fixo vai para o log, com o complemento quando houver', async () => {
    const geo = await novoGeo();
    await patch({
      geoId: geo.id,
      status: Status.Rejected,
      motivo: MotivoRejeicaoGeo.JaCadastrado,
      refuseReason: '  igual ao Cursinho X  ',
    }).expect(200);
    expect(await ultimoLog(geo.id)).toContain(
      'Status: Pendente -> Rejeitado · Motivo: Cursinho já cadastrado — igual ao Cursinho X',
    );
  });

  it('motivo fixo sem complemento', async () => {
    const geo = await novoGeo();
    await patch({
      geoId: geo.id,
      status: Status.Rejected,
      motivo: MotivoRejeicaoGeo.NaoECursinhoPopular,
    }).expect(200);
    expect(await ultimoLog(geo.id)).toContain(
      'Motivo: Não é um cursinho popular"',
    );
  });

  it('"Outro" exige o texto', async () => {
    const geo = await novoGeo();
    await patch({
      geoId: geo.id,
      status: Status.Rejected,
      motivo: MotivoRejeicaoGeo.Outro,
      refuseReason: '   ',
    }).expect(400);
    await patch({
      geoId: geo.id,
      status: Status.Rejected,
      motivo: MotivoRejeicaoGeo.Outro,
      refuseReason: 'Endereço é de uma escola particular',
    }).expect(200);
    expect(await ultimoLog(geo.id)).toContain(
      'Motivo: Outro — Endereço é de uma escola particular',
    );
  });

  it('motivo desconhecido ou texto acima de 500 → 400', async () => {
    const geo = await novoGeo();
    await patch({ geoId: geo.id, status: Status.Rejected, motivo: 'X' }).expect(
      400,
    );
    await patch({
      geoId: geo.id,
      status: Status.Rejected,
      motivo: MotivoRejeicaoGeo.Outro,
      refuseReason: 'a'.repeat(501),
    }).expect(400);
  });

  it('aprovar continua sem motivo', async () => {
    const geo = await novoGeo();
    await patch({ geoId: geo.id, status: Status.Approved }).expect(200);
    expect(await ultimoLog(geo.id)).toBe('"Status: Pendente -> Aprovado"');
  });
});
