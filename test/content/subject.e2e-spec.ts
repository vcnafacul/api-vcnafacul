import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { CreateFrenteDTOInput } from 'src/modules/contents/frente/dtos/create-frente.dto.input';
import { Materias } from 'src/modules/contents/frente/enum/materias';
import { FrenteService } from 'src/modules/contents/frente/frente.service';
import { CreateSubjectDTOInput } from 'src/modules/contents/subject/dtos/create-subject.dto.input';
import { UpdateSubjectDTOInput } from 'src/modules/contents/subject/dtos/update-subject.dto.input';
import { SubjectService } from 'src/modules/contents/subject/subject.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
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
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  it('change order subject', async () => {
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

    const sub1 = await subjectService.create(dto1);
    const sub2 = await subjectService.create(dto2);

    const frenteOrder = await frenteService.findOneBy({ id: frente.id });
    const subject1 = await subjectService.findOneBy({
      id: sub1.id,
    });
    const subject2 = await subjectService.findOneBy({
      id: sub2.id,
    });

    expect(frenteOrder.head).toBe(subject1.id);
    expect(subject1.next).toBe(subject2.id);
    expect(subject2.next).toBe(null);

    const { token } = await createUser();

    const dtoOrder: ChangeOrderDTOInput = {
      listId: frente.id,
      node1: sub2.id,
      node2: sub1.id,
    };

    await request(app.getHttpServer())
      .patch(`/subject/order`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dtoOrder);

    const frenteOrderUpdated = await frenteService.findOneBy({ id: frente.id });
    const subject1Updated = await subjectService.findOneBy({
      id: sub1.id,
    });
    const subject2Updated = await subjectService.findOneBy({
      id: sub2.id,
    });

    expect(frenteOrderUpdated.head).toBe(subject2Updated.id);
    expect(subject2Updated.next).toBe(subject1Updated.id);
    expect(subject1Updated.next).toBe(null);
  }, 30000);

  it('should swap middle and last node correctly', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);

    const dto1 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto2 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto3 = { frente: frente.id, name: uuidv4(), description: uuidv4() };

    const sub1 = await subjectService.create(dto1);
    const sub2 = await subjectService.create(dto2);
    const sub3 = await subjectService.create(dto3);

    const { token } = await createUser();

    const dtoOrder: ChangeOrderDTOInput = {
      listId: frente.id,
      node1: sub2.id,
      node2: sub3.id,
    };

    await request(app.getHttpServer())
      .patch(`/subject/order`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dtoOrder);

    const updated1 = await subjectService.findOneBy({ id: sub1.id });
    const updated2 = await subjectService.findOneBy({ id: sub2.id });
    const updated3 = await subjectService.findOneBy({ id: sub3.id });

    expect(updated1.next).toBe(sub3.id);
    expect(updated3.prev).toBe(sub1.id);
    expect(updated3.next).toBe(sub2.id);
    expect(updated2.prev).toBe(sub3.id);
    expect(updated2.next).toBe(null);
  });

  it('should swap head and tail nodes', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);

    const dto1 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto2 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto3 = { frente: frente.id, name: uuidv4(), description: uuidv4() };

    const sub1 = await subjectService.create(dto1);
    const sub2 = await subjectService.create(dto2);
    const sub3 = await subjectService.create(dto3);

    const { token } = await createUser();

    const dtoOrder: ChangeOrderDTOInput = {
      listId: frente.id,
      node1: sub1.id,
      node2: sub3.id,
    };

    await request(app.getHttpServer())
      .patch(`/subject/order`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dtoOrder);

    const frenteUpdated = await frenteService.findOneBy({ id: frente.id });
    const updated1 = await subjectService.findOneBy({ id: sub1.id });
    const updated2 = await subjectService.findOneBy({ id: sub2.id });
    const updated3 = await subjectService.findOneBy({ id: sub3.id });

    expect(frenteUpdated.head).toBe(sub3.id);
    expect(frenteUpdated.tail).toBe(sub1.id);
    expect(updated3.next).toBe(sub2.id);
    expect(updated2.prev).toBe(sub3.id);
    expect(updated2.next).toBe(sub1.id);
    expect(updated1.prev).toBe(sub2.id);
    expect(updated1.next).toBe(null);
  });

  it('should do nothing when trying to swap a node with itself', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);

    const dto = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const sub = await subjectService.create(dto);

    const { token } = await createUser();

    const dtoOrder: ChangeOrderDTOInput = {
      listId: frente.id,
      node1: sub.id,
      node2: sub.id,
    };

    await request(app.getHttpServer())
      .patch(`/subject/order`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dtoOrder)
      .expect(200); // ou outro comportamento que você definiu

    const frenteCheck = await frenteService.findOneBy({ id: frente.id });
    expect(frenteCheck.head).toBe(sub.id);
    expect(frenteCheck.tail).toBe(sub.id);
  });

  it('get subjects by Frente, regardless of order', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);
    expect(frente.id).not.toBeNull();

    const dto1 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto2 = { frente: frente.id, name: uuidv4(), description: uuidv4() };
    const dto3 = { frente: frente.id, name: uuidv4(), description: uuidv4() };

    const sub1 = await subjectService.create(dto1);
    const sub2 = await subjectService.create(dto2);
    const sub3 = await subjectService.create(dto3);

    const expectedIds = [sub1.id, sub2.id, sub3.id];

    const { token } = await createUser();

    const response = await request(app.getHttpServer())
      .get(`/subject/frente/${frente.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const receivedIds = response.body.map((s: any) => s.id);

    // Verifica quantidade
    expect(receivedIds).toHaveLength(3);

    // Verifica se todos os ids esperados estão presentes (independente da ordem)
    expectedIds.forEach((id) => {
      expect(receivedIds).toContain(id);
    });
  });

  it('update subject', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);
    const dto: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };
    const { token } = await createUser();
    const subject = await subjectService.create(dto);
    const dtoUpdate: UpdateSubjectDTOInput = {
      id: subject.id,
      name: uuidv4(),
      description: uuidv4(),
    };
    await request(app.getHttpServer())
      .patch(`/subject`)
      .send(dtoUpdate)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const subjectUpdated = await subjectService.findOneBy({ id: subject.id });
    expect(subjectUpdated.name).toBe(dtoUpdate.name);
    expect(subjectUpdated.description).toBe(dtoUpdate.description);
  });

  it('update subject, subject not found', async () => {
    const { token } = await createUser();
    const dto: UpdateSubjectDTOInput = {
      id: 'subject.id',
      name: uuidv4(),
      description: uuidv4(),
    };
    await request(app.getHttpServer())
      .patch(`/subject`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe(`Subject not found by id ${dto.id}`);
      });
  });

  it('delete subject', async () => {
    const dtoFrente: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: Materias.Matematica,
    };
    const frente = await frenteService.create(dtoFrente);
    const dto: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };
    const { token } = await createUser();
    const subject = await subjectService.create(dto);
    await request(app.getHttpServer())
      .delete(`/subject/${subject.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const subjectDeleted = await subjectService.findOneBy({ id: subject.id });
    expect(subjectDeleted).toBeNull();
  });
});
