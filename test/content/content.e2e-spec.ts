import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { ContentService } from 'src/modules/contents/content/content.service';
import { CreateContentDTOInput } from 'src/modules/contents/content/dtos/create-content.dto.input';
import { StatusContent } from 'src/modules/contents/content/enum/status-content';
import { GetAllContentInput } from 'src/modules/contents/content/interface/get-all-content.input';
import { FileContentRepository } from 'src/modules/contents/file-content/file-content.repository';
import { CreateFrenteDTOInput } from 'src/modules/contents/frente/dtos/create-frente.dto.input';
import { Materias } from 'src/modules/contents/frente/enum/materias';
import { FrenteService } from 'src/modules/contents/frente/frente.service';
import { CreateSubjectDTOInput } from 'src/modules/contents/subject/dtos/create-subject.dto.input';
import { SubjectService } from 'src/modules/contents/subject/subject.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { ChangeOrderDTOInput } from 'src/shared/modules/node/dtos/change-order.dto.input';
import { BlobService } from 'src/shared/services/blob/blob-service';
import * as request from 'supertest';
import { CreateUserDtoInputFaker } from 'test/faker/create-user.dto.input.faker';
import { FileFaker } from 'test/faker/file.faker';
import { createNestAppTest } from 'test/utils/createNestAppTest';
import { v4 as uuidv4 } from 'uuid';

jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');

describe('Content (e2e)', () => {
  let app: INestApplication;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let frenteService: FrenteService;
  let userService: UserService;
  let userRepository: UserRepository;
  let roleService: RoleService;
  let jwtService: JwtService;
  let subjectService: SubjectService;
  let contentService: ContentService;
  let blobService: BlobService;
  let fileContentRepository: FileContentRepository;

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
    contentService = moduleFixture.get<ContentService>(ContentService);
    blobService = moduleFixture.get<BlobService>('BlobService');
    fileContentRepository = moduleFixture.get<FileContentRepository>(
      FileContentRepository,
    );

    jest.spyOn(blobService, 'deleteFile').mockImplementation(async () => {
      {
      }
    });
    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => 'hashKeyFile');

    jest
      .spyOn(blobService, 'getFile')
      .mockImplementation(async () =>
        Buffer.from('conteúdo fake de um arquivo'),
      );

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSubject(materia: Materias = Materias.Matematica) {
    const dto: CreateFrenteDTOInput = {
      name: uuidv4(),
      materia: materia,
    };
    const frente = await frenteService.create(dto);
    expect(frente.id).not.toBeNull();

    const dtoSubject: CreateSubjectDTOInput = {
      frente: frente.id,
      name: uuidv4(),
      description: uuidv4(),
    };

    const subject = await subjectService.create(dtoSubject);
    expect(subject.id).not.toBeNull();

    return { frente, subject };
  }

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

  it('create content', async () => {
    const { subject } = await createSubject();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/content')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  });

  it('create content, Subject not found', async () => {
    const dto: CreateContentDTOInput = {
      subjectId: 'hash-not-found',
      title: uuidv4(),
      description: uuidv4(),
    };

    const { token } = await createUser();

    await request(app.getHttpServer())
      .post('/content')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe(
          `Tema não encontrado com o ID ${dto.subjectId}`,
        );
      });
  });

  it('create content, unique title by subject', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    await contentService.create(dto, user);

    const dto2: CreateContentDTOInput = {
      subjectId: subject.id,
      title: dto.title,
      description: uuidv4(),
    };

    await request(app.getHttpServer())
      .post('/content')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe(
          'Já existe um conteúdo chamado "' + dto2.title + '" nessa tema.',
        );
      });
  });

  it('find all content', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    await contentService.create(dto, user);

    const query: GetAllContentInput = {
      page: 1,
      limit: 10,
      status: StatusContent.Pending_Upload,
      subjectId: subject.id,
      materia: Materias.Matematica,
      title: dto.title,
    };

    await request(app.getHttpServer())
      .get('/content')
      .query(query)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBe(1);
      });
  });

  it('get all in order', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const dto2: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const dto3: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    await contentService.create(dto, user);
    await contentService.create(dto2, user);
    await contentService.create(dto3, user);

    const query = {
      subjectId: subject.id,
      status: StatusContent.Pending_Upload,
    };

    await request(app.getHttpServer())
      .get('/content/order')
      .query(query)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].title).toBe(dto.title);
        expect(res.body[1].title).toBe(dto2.title);
        expect(res.body[2].title).toBe(dto3.title);
      });
  });

  it('get demanda', async () => {
    const { subject } = await createSubject(Materias.Geografia);
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    await contentService.create(dto, user);

    await request(app.getHttpServer())
      .get(`/content/demand`)
      .query({
        page: 1,
        limit: 10,
      })
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });

  it('change order contents', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const dto2: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const cont1 = await contentService.create(dto, user);
    const cont2 = await contentService.create(dto2, user);

    const subjectOrder = await subjectService.findOneBy({ id: subject.id });
    const content1 = await contentService.findOneBy({
      id: cont1.id,
    });
    const content2 = await contentService.findOneBy({
      id: cont2.id,
    });

    expect(subjectOrder.head).toBe(content1.id);
    expect(content1.next).toBe(content2.id);
    expect(content2.next).toBe(null);

    const dtoOrder: ChangeOrderDTOInput = {
      listId: subject.id,
      node1: cont1.id,
      node2: cont2.id,
    };

    await request(app.getHttpServer())
      .patch(`/content/order`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dtoOrder)
      .expect(200);

    const subjectOrderUpdated = await subjectService.findOneBy({
      id: subject.id,
    });
    const content1Updated = await contentService.findOneBy({
      id: cont1.id,
    });
    const content2Updated = await contentService.findOneBy({
      id: cont2.id,
    });

    expect(subjectOrderUpdated.head).toBe(content2.id);
    expect(content1Updated.next).toBe(null);
    expect(content2Updated.next).toBe(content1.id);
  }, 30000);

  it('should swap middle and last node correctly', async () => {
    const { subject } = await createSubject();
    const { user } = await createUser();

    const dto1: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const dto2: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const dto3: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const cont1 = await contentService.create(dto1, user);
    const cont2 = await contentService.create(dto2, user);
    const cont3 = await contentService.create(dto3, user);

    await contentService.changeOrder({
      listId: subject.id,
      node1: cont2.id,
      node2: cont3.id,
    });

    const updated1 = await contentService.findOneBy({ id: cont1.id });
    const updated2 = await contentService.findOneBy({ id: cont2.id });
    const updated3 = await contentService.findOneBy({ id: cont3.id });

    expect(updated1.next).toBe(cont3.id);
    expect(updated3.prev).toBe(cont1.id);
    expect(updated3.next).toBe(cont2.id);
    expect(updated2.prev).toBe(cont3.id);
    expect(updated2.next).toBe(null);
  });

  it('change status content', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);

    await request(app.getHttpServer())
      .patch(`/content/status`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        id: content.id,
        status: StatusContent.Rejected,
      })
      .expect(200);

    const updated = await contentService.findOneBy({ id: content.id });

    expect(updated.status).toBe(StatusContent.Rejected);
  });

  it('reset status content', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);

    await request(app.getHttpServer())
      .patch(`/content/status`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        id: content.id,
        status: StatusContent.Rejected,
      })
      .expect(200);

    const updated = await contentService.findOneBy({ id: content.id });

    expect(updated.status).toBe(StatusContent.Rejected);

    await request(app.getHttpServer())
      .patch(`/content/reset/${content.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated2 = await contentService.findOneBy({ id: content.id });

    expect(updated2.status).toBe(StatusContent.Pending_Upload);
  });

  it('upload file content', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo docx');

    await request(app.getHttpServer())
      .post(`/content/upload/${content.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .attach('file', fakeFileBuffer, 'test.pdf')
      .expect(201);

    const updated = await contentService.findOneBy({ id: content.id });

    expect(updated.file).not.toBeNull();
    expect(updated.file.originalName).toBe('test.pdf');
    expect(updated.file.fileKey).toBe('hashKeyFile');
  }, 30000);

  it('upload file content, file not found', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);

    await request(app.getHttpServer())
      .post(`/content/upload/${content.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .attach('file', null)
      .expect(400)
      .then((res) => {
        expect(res.body.message).toBe('file not found');
      });
  }, 30000);

  it('upload file content, demand not found', async () => {
    const { token } = await createUser();
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo docx');

    await request(app.getHttpServer())
      .post(`/content/upload/hash-not-found`)
      .set({ Authorization: `Bearer ${token}` })
      .attach('file', fakeFileBuffer, 'test.pdf')
      .expect(404)
      .then((res) => {
        expect(res.body.message).toBe('demand not found');
      });
  }, 30000);

  it('delete content', async () => {
    const { subject } = await createSubject();
    const { token, user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);

    await request(app.getHttpServer())
      .delete(`/content/${content.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const deleted = await contentService.findOneBy({ id: content.id });

    expect(deleted).toBeNull();
  });

  it('delete content, content not found', async () => {
    const { token } = await createUser();

    await request(app.getHttpServer())
      .delete(`/content/hash-not-found`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .then((res) => {
        expect(res.body.message).toBe(`Content not found by id hash-not-found`);
      });
  });

  it('reset content without delete file', async () => {
    const { subject } = await createSubject();
    const { user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);
    const fileFaker = FileFaker({ originalName: 'fake.pdf' });

    await contentService.uploadFile(content.id, user, fileFaker);

    await contentService.reset(content.id, user);

    const updated = await contentService.findOneBy({ id: content.id });

    expect(updated.status).toBe(StatusContent.Pending_Upload);
    expect(updated.file).toBeNull();
    expect(updated.files.length).toBe(1);
  });

  it('delete content deleting file', async () => {
    const { subject } = await createSubject();
    const { user } = await createUser();

    const dto: CreateContentDTOInput = {
      subjectId: subject.id,
      title: uuidv4(),
      description: uuidv4(),
    };

    const content = await contentService.create(dto, user);
    const fileFaker = FileFaker({ originalName: 'fake.pdf' });

    await contentService.uploadFile(content.id, user, fileFaker);

    const updated = await contentService.findOneBy({ id: content.id });

    await contentService.delete(content.id);

    const file = await fileContentRepository.findOneBy({ id: updated.file.id });

    expect(file).toBeNull();
  });
});
