import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { CreateFrenteDTOInput } from 'src/modules/contents/frente/dtos/create-frente.dto.input';
import { Materias } from 'src/modules/contents/frente/enum/materias';
import { FrenteService } from 'src/modules/contents/frente/frente.service';
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

describe('Subject (e2e)', () => {
  let app: INestApplication;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let frenteService: FrenteService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let jwtService: JwtService;
  let subjectService: SubjectService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = createNestAppTest(moduleFixture);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    frenteService = moduleFixture.get<FrenteService>(FrenteService);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    roleService = moduleFixture.get<RoleService>(RoleService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
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

  it('create subject', async () => {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dto);
    expect(frente.id).not.toBeNull();

    const dtoSubject: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/subject')
      .send(dtoSubject)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  });

  it('create subject, frente not found', async () => {
    const dtoSubject: CreateSubjectDTOInput = {
      frente: uuidv4(),
      name: uuidv4(),
      description: uuidv4(),
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/subject')
      .send(dtoSubject)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe(
          `Frente não encontrada com o ID ${dtoSubject.frente}`,
        );
      });
  });

  it('create subject, duplicate key value', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);
    expect(frente.id).not.toBeNull();

    const dto: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/subject')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    await request(app.getHttpServer())
      .post('/subject')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe(
          `Já existe um tema chamado "${dto.name}" nessa frente.`,
        );
      });
  });

  it('get subjects by order', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);
    expect(frente.id).not.toBeNull();

    const dto1: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const dto2: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const dto3: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    await subjectService.create(dto1);
    await subjectService.create(dto2);
    await subjectService.create(dto3);

    const { token } = await createUser();

    await request(app.getHttpServer())
      .get(`/subject/order?frenteId=${frente.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBe(3);
      });
  }, 30000);
});
