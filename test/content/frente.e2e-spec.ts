import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { CreateFrenteDTOInput } from 'src/modules/contents/frente/dtos/create-frente.dto.input';
import { Materias } from 'src/modules/contents/frente/enum/materias';
import { FrenteRepository } from 'src/modules/contents/frente/frente.repository';
import { CreateSubjectDTOInput } from 'src/modules/contents/subject/dtos/create-subject.dto.input';
import { SubjectService } from 'src/modules/contents/subject/subject.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from 'test/faker/create-user.dto.input.faker';
import { createNestAppTest } from 'test/utils/createNestAppTest';
import { v4 as uuidv4 } from 'uuid';

jest.mock('src/shared/services/email/email.service');

describe('Frente (e2e)', () => {
  let app: INestApplication;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let jwtService: JwtService;
  let frenteRepository: FrenteRepository;
  let subjectService: SubjectService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    roleService = moduleFixture.get<RoleService>(RoleService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    frenteRepository = moduleFixture.get<FrenteRepository>(FrenteRepository);
    subjectService = moduleFixture.get<SubjectService>(SubjectService);

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUser() {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({
      email: userDto.email,
    });
    const admin = await roleService.findOneBy({ name: 'admin' });
    user.role = admin;
    await userRepository.update(user);

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return { user, token };
  }

  it('create frente', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  });

  it('create frente, duplicate key value', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe(
          `Já existe uma frente com o nome "${dto.name}" para essa matéria.`,
        );
      });
  });

  it('deve retornar apenas as frentes da matéria informada', async () => {
    const { token } = await createUser();

    const dto1 = {
      name: `${uuidv4()}-mat-1`,
      materia: Materias.Artes,
    };
    const dto2 = {
      name: `${uuidv4()}-mat-2`,
      materia: Materias.Artes,
    };
    const dto3 = {
      name: `${uuidv4()}-fisica`,
      materia: Materias.Fisica,
    };

    // Cria as 3 frentes
    await request(app.getHttpServer())
      .post('/frente')
      .send(dto1)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    await request(app.getHttpServer())
      .post('/frente')
      .send(dto2)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    await request(app.getHttpServer())
      .post('/frente')
      .send(dto3)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    // Faz a requisição para buscar frentes de Matemática (índice 6)
    const res = await request(app.getHttpServer())
      .get(`/frente/materia/${Materias.Artes}`) // ou `6`
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // Espera 2 frentes da matéria Matematica
    expect(res.body).toHaveLength(2);

    // Verifica se são realmente as frentes corretas
    const names = res.body.map((f: any) => f.name);
    expect(names).toContain(dto1.name);
    expect(names).toContain(dto2.name);

    await frenteRepository.delete(res.body[0].id);
    await frenteRepository.delete(res.body[1].id);
  });

  it('update frente', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const { token } = await createUser();

    const frente = await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    await request(app.getHttpServer())
      .patch(`/frente`)
      .send({
        name: uuidv4(),
        id: frente.body.id,
      })
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  });

  it('delete frente', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const { token } = await createUser();

    const frente = await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    await request(app.getHttpServer())
      .delete(`/frente/${frente.body.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  });

  it('delete frente with subject', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const { token } = await createUser();

    const frente = await request(app.getHttpServer())
      .post('/frente')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    const dtoSubject: CreateSubjectDTOInput = {
      frente: frente.body.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    await subjectService.create(dtoSubject);

    await request(app.getHttpServer())
      .delete(`/frente/${frente.body.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe(
          "It's not possible to delete frente with subject",
        );
      });
  });
});
