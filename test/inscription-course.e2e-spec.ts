import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { assert } from 'console';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { RoleService } from 'src/modules/role/role.service';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import createFakeDocxBase64 from './utils/createFakeDocxBase64';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');

describe('InscriptionCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let inscriptionService: InscriptionCourseService;
  let inscriptionRepository: InscriptionCourseRepository;
  let studentCourseService: StudentCourseService;
  let studentCourseRepository: StudentCourseRepository;
  let blobService: BlobService;
  let submissionService: SubmissionService;
  let logPartnerRepository: LogPartnerRepository;
  let logGeoRepository: LogGeoRepository;

  const formServiceMock = {
    hasActiveForm: jest.fn().mockResolvedValue(true),
    createFormFull: jest.fn().mockResolvedValue('hashKeyFile'),
    getFormFullByInscriptionId: jest.fn().mockResolvedValue('hashKeyFile'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(FormService)
      .useValue(formServiceMock)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );

    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    inscriptionService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    inscriptionRepository = moduleFixture.get<InscriptionCourseRepository>(
      InscriptionCourseRepository,
    );
    studentCourseService =
      moduleFixture.get<StudentCourseService>(StudentCourseService);
    studentCourseRepository = moduleFixture.get<StudentCourseRepository>(
      StudentCourseRepository,
    );
    blobService = moduleFixture.get<BlobService>('BlobService');
    submissionService = moduleFixture.get<SubmissionService>(SubmissionService);

    logPartnerRepository =
      moduleFixture.get<LogPartnerRepository>(LogPartnerRepository);
    logGeoRepository = moduleFixture.get<LogGeoRepository>(LogGeoRepository);

    jest
      .spyOn(logPartnerRepository, 'create')
      .mockImplementation(async () => ({}) as any);

    jest
      .spyOn(logGeoRepository, 'create')
      .mockImplementation(async () => ({}) as any);

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});
    jest
      .spyOn(blobService, 'uploadFile')
      .mockImplementation(async () => 'hashKeyFile');

    jest
      .spyOn(blobService, 'getFile')
      .mockImplementation(async (fileKey: string) => {
        if (fileKey === 'termo_template.docx') {
          return {
            buffer: createFakeDocxBase64(),
          };
        }
        return Buffer.from('conteúdo fake de um arquivo');
      });
    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    if (app) await app.close();
  }, 30000);

  it('test to pass', () => {
    assert(true);
  });

  async function createUserRepresentative() {
    const userRepresentativeDto = CreateUserDtoInputFaker();
    await userService.create(userRepresentativeDto);
    const userRepresentative = await userRepository.findOneBy({
      email: userRepresentativeDto.email,
    });
    const admin = await roleService.findOneBy({ name: 'admin' });
    userRepresentative.role = admin;
    await userRepository.update(userRepresentative);

    return userRepresentative;
  }

  async function createPartnerPrepCourse() {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representative = await createUserRepresentative();

    const partnerPrepCourse = await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        representative: representative.id,
      },
      representative.id,
    );
    partnerPrepCourse.geo = {
      id: geo.id,
      name: geo.name,
      category: geo.category,
      street: geo.street,
      number: geo.number,
      complement: geo.complement,
      neighborhood: geo.neighborhood,
      state: geo.state,
      city: geo.city,
    };
    return {
      representative,
      partnerPrepCourse,
    };
  }

  it('should create a new inscription course', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(inscriptionCourseDto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201);
  }, 100000);

  it('should not create a new inscription with end date before today', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionCourseDto.endDate = new Date();
    inscriptionCourseDto.endDate.setDate(
      inscriptionCourseDto.endDate.getDate() - 1,
    );

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(inscriptionCourseDto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Data de término do curso não pode ser menor que a data atual',
        );
      });
  });

  it('inscription with start date after today need to be pending', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionCourseDto.startDate = new Date();
    inscriptionCourseDto.startDate.setDate(
      inscriptionCourseDto.startDate.getDate() + 1,
    );

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .post('/inscription-course')
      .send(inscriptionCourseDto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('actived');
        expect(res.body.actived).toBe(Status.Pending);
      });
  });

  it('get all inscription course', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription1 = CreateInscriptionCourseDTOInputFaker();
    await inscriptionService.create(inscription1, representative.id);

    const inscription2 = CreateInscriptionCourseDTOInputFaker();
    await inscriptionService.create(inscription2, representative.id);

    await request(app.getHttpServer())
      .get('/inscription-course')
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toBe(2);
      });
  });

  it('get one inscription course', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    await request(app.getHttpServer())
      .get(`/inscription-course/${inscriptionCreated.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(inscriptionCreated.id);
      });
  });

  it('get a course application for student registration', async () => {
    const { representative, partnerPrepCourse } =
      await createPartnerPrepCourse();

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const userStudentDto = CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const student = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const token = await jwtService.signAsync(
      { user: { id: student.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/inscription-course/to-inscription/${inscriptionCreated.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('prepCourseName');
        expect(res.body.prepCourseName).toBe(partnerPrepCourse.geo.name);
        expect(res.body).toHaveProperty('inscription');
        expect(res.body.inscription).toHaveProperty('name');
        expect(res.body.inscription.name).toBe(inscription.name);
        expect(res.body.inscription).toHaveProperty('description');
        expect(res.body.inscription.description).toBe(inscription.description);
        expect(res.body.inscription).toHaveProperty('startDate');
        expect(
          new Date(res.body.inscription.startDate).getTime() -
            new Date(inscriptionCreated.startDate).getTime(),
        ).toBeLessThanOrEqual(1000);
        expect(res.body.inscription).toHaveProperty('endDate');
        expect(
          new Date(res.body.inscription.endDate).getTime() -
            new Date(inscriptionCreated.endDate).getTime(),
        ).toBeLessThanOrEqual(1000);
        expect(res.body.inscription).toHaveProperty('status');
        expect(res.body.inscription.status).toBe(Status.Approved);
      });
  });

  it('try get a course application for student registration with id not exist', async () => {
    const userStudentDto = CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const student = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const token = await jwtService.signAsync(
      { user: { id: student.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/inscription-course/to-inscription/hashid-not-exist`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('cancel a inscription course', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    await request(app.getHttpServer())
      .delete(`/inscription-course/${inscriptionCreated.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200);

    const inscriptionCanceled = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });

    expect(inscriptionCanceled.actived).toBe(Status.Rejected);
    expect(inscriptionCanceled.deletedAt).not.toBeNull();
  });

  it('try cancel a inscription course with id not exist', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .delete(`/inscription-course/hashid-not-exist`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('try update a inscription course with id not exist', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .send({ ...inscriptionCreated, id: 'hashid-not-exist' })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('should update an inscription course successfully when data is valid', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição com data no futuro para permitir alterações
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() + 5);
    inscription.endDate = new Date(inscription.startDate);
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const newName = 'Novo Nome do Curso';
    const newDescription = 'Descrição atualizada do curso';

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        name: newName,
        description: newDescription,
      })
      .expect(200);

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(updated.name).toBe(newName);
    expect(updated.description).toBe(newDescription);
  });

  it('should return 400 when end date is before today', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição com data no futuro
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() + 5);
    inscription.endDate = new Date(inscription.startDate);
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        endDate: yesterday,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Data de término do curso não pode ser menor que a data atual',
        );
      });
  });

  it('should set actived status to Approved if startDate is before today (when editing future inscription)', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição com data no futuro (ainda não começou)
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() + 5);
    inscription.endDate = new Date(inscription.startDate);
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        startDate: pastDate,
      })
      .expect(200);

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(updated.actived).toBe(Status.Approved);
  });

  it('should keep actived unchanged if startDate is in the future (when editing future inscription)', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição com data no futuro
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() + 5);
    inscription.endDate = new Date(inscription.startDate);
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        startDate: futureDate,
      })
      .expect(200);

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(updated.actived).toBe(Status.Pending);
  });

  it('should not allow changing start date of an inscription in progress', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição que já começou
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);
    inscription.endDate = new Date();
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const newStartDate = new Date();
    newStartDate.setDate(newStartDate.getDate() - 10);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        startDate: newStartDate,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar a data de início de um processo seletivo em andamento',
        );
      });
  });

  it('should not allow changing dates of a finished inscription', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição que já terminou
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 30);

    const inscriptionCreatedDTO = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);

    const inscriptionCreated = await inscriptionRepository.findOneBy({
      id: inscriptionCreatedDTO.id,
    });

    Object.assign(inscriptionCreated, {
      endDate: endDate,
    });

    await inscriptionRepository.update(inscriptionCreated);

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() - 1);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        endDate: newEndDate,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Data de término do curso não pode ser menor que a data atual',
        );
      });
    newEndDate.setDate(newEndDate.getDate() + 30);

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        endDate: newEndDate,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar as datas de um processo seletivo já finalizado',
        );
      });
  });

  it('should allow updating only description when inscription is in progress', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição que já começou
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);
    inscription.endDate = new Date();
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const newDescription = 'Nova descrição';

    await request(app.getHttpServer())
      .patch(`/inscription-course`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        ...inscriptionCreated,
        description: newDescription,
      })
      .expect(200);

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(updated.description).toBe(newDescription);
  });

  it('get subscribers', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );
    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );

    const student = await studentCourseService.create(studentDto);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/inscription-course/subscribers/${inscriptionCreated.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(student.id);
      });
  });

  it('should return 400 if the inscription course does not exist', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/inscription-course/subscribers/hashid-not-exist`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('updateWaitingList - should return 404 if the inscription course does not exist ', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      id: 'hashid-not-exist',
      studentId: 'hashid-not-exist',
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('updateWaitingList - should return 400 if the student does not exist ', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const dto = {
      id: inscriptionCreated.id,
      studentId: 'hashid-not-exist',
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('updateWaitingList - should return 400 if the student already is enrolled ', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );

    const studentOutput = await studentCourseService.create(studentDto);
    const student = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    student.applicationStatus = StatusApplication.Enrolled;
    await studentCourseRepository.update(student);

    const dto = {
      id: inscriptionCreated.id,
      studentId: studentOutput.id,
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar status de lista de espera de estudantes matriculados',
        );
      });
  });

  it('updateWaitingList - should return 400 if the student already is enrolled ', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );

    const studentOutput = await studentCourseService.create(studentDto);
    const student = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    student.applicationStatus = StatusApplication.Enrolled;
    await studentCourseRepository.update(student);

    const dto = {
      id: inscriptionCreated.id,
      studentId: studentOutput.id,
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar status de lista de espera de estudantes matriculados',
        );
      });
  });

  it('updateWaitingList - should add student to waiting list if status is UnderReview and waitingList = true', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );
    const studentOutput = await studentCourseService.create(studentDto);
    const student = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    student.applicationStatus = StatusApplication.UnderReview;
    student.selectEnrolled = true;
    student.waitingList = false;
    await studentCourseRepository.update(student);

    const dto = {
      id: inscriptionCreated.id,
      studentId: studentOutput.id,
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dto)
      .expect(200);

    const updated = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    expect(updated.waitingList).toBe(true);
    expect(updated.selectEnrolled).toBe(false);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);
  });

  it('updateWaitingList - should add/remove student from waiting list', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscriptionDto,
      representative.id,
    );

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );
    const studentOutput = await studentCourseService.create(studentDto);

    const dto1 = {
      id: inscriptionCreated.id,
      studentId: studentOutput.id,
      waitingList: true,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dto1)
      .expect(200);

    let updated = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    expect(updated.waitingList).toBe(true);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);

    const inscription = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(inscription.head).toBe(studentOutput.id);

    const dto2 = {
      id: inscriptionCreated.id,
      studentId: studentOutput.id,
      waitingList: false,
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-waiting-list`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dto2)
      .expect(200);

    updated = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    expect(updated.waitingList).toBe(false);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);
  });

  it('updateWaitingList - should add/remove students from waiting list', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscriptionDto,
      representative.id,
    );

    // student 1

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );
    const studentOutput = await studentCourseService.create(studentDto);

    await inscriptionService.updateWaitingList(
      inscriptionCreated.id,
      studentOutput.id,
      true,
    );

    const updated = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    expect(updated.waitingList).toBe(true);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);

    let inscription = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(inscription.head).toBe(studentOutput.id);

    // student 2

    const userStudentDto2 = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto2);
    const userStudent2 = await userRepository.findOneBy({
      email: userStudentDto2.email,
    });

    const studentDto2 = createStudentCourseDTOInputFaker(
      userStudent2.id,
      inscriptionCreated.id,
    );
    const studentOutput2 = await studentCourseService.create(studentDto2);

    await inscriptionService.updateWaitingList(
      inscriptionCreated.id,
      studentOutput2.id,
      true,
    );

    inscription = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(inscription.head).toBe(studentOutput.id);
    expect(inscription.lenght).toBe(2);
  });

  it('updateWaitingList - should change order students from waiting list', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    const inscriptionCreated = await inscriptionService.create(
      inscriptionDto,
      representative.id,
    );

    // student 1

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionCreated.id,
    );
    const studentOutput = await studentCourseService.create(studentDto);

    await inscriptionService.updateWaitingList(
      inscriptionCreated.id,
      studentOutput.id,
      true,
    );

    const updated = await studentCourseService.findOneBy({
      id: studentOutput.id,
    });
    expect(updated.waitingList).toBe(true);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);

    // student 2

    const userStudentDto2 = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto2);
    const userStudent2 = await userRepository.findOneBy({
      email: userStudentDto2.email,
    });

    const studentDto2 = createStudentCourseDTOInputFaker(
      userStudent2.id,
      inscriptionCreated.id,
    );
    const studentOutput2 = await studentCourseService.create(studentDto2);

    await inscriptionService.updateWaitingList(
      inscriptionCreated.id,
      studentOutput2.id,
      true,
    );

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      id: inscriptionCreated.id,
      studentsId: [studentOutput2.id, studentOutput.id],
    };

    await request(app.getHttpServer())
      .patch(`/inscription-course/update-order-waiting-list`)
      .set({ Authorization: `Bearer ${token}` })
      .send(dto)
      .expect(200);

    const inscription = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(inscription.head).toBe(studentOutput2.id);
    expect(inscription.lenght).toBe(2);
  });

  it('should successfully extend an inscription course', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição ativa
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const newEndDate = new Date();
    newEndDate.setHours(0, 0, 0, 0);
    newEndDate.setDate(newEndDate.getDate() + 60);

    await request(app.getHttpServer())
      .patch(`/inscription-course/${inscriptionCreated.id}/extend`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        endDate: newEndDate,
      })
      .expect(200);

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    newEndDate.setDate(newEndDate.getDate() + 1);
    const updatedDate = new Date(updated.endDate);
    updatedDate.setHours(0, 0, 0, 0);
    expect(updatedDate.getTime()).toBe(newEndDate.getTime());
  });

  it('should not allow setting end date in the past', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição ativa
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);
    inscription.endDate = new Date();
    inscription.endDate.setDate(inscription.endDate.getDate() + 10);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    await request(app.getHttpServer())
      .patch(`/inscription-course/${inscriptionCreated.id}/extend`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        endDate: pastDate,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Data de término não pode ser menor que a data atual',
        );
      });
  });

  it('should not allow setting end date before current end date', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição ativa
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);
    inscription.endDate = new Date();
    inscription.endDate.setDate(inscription.endDate.getDate() + 30);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    const earlierEndDate = new Date();
    earlierEndDate.setDate(earlierEndDate.getDate() + 15);

    await request(app.getHttpServer())
      .patch(`/inscription-course/${inscriptionCreated.id}/extend`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        endDate: earlierEndDate,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'A nova data de término deve ser posterior à data atual de término',
        );
      });
  });

  it('should return 404 when inscription does not exist', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 30);

    await request(app.getHttpServer())
      .patch(`/inscription-course/non-existent-id/extend`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        endDate: newEndDate,
      })
      .expect(404);
  });

  it('should update status to Approved when extending an inscription that has already started', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    // Criar inscrição ativa (já começou)
    const inscription = CreateInscriptionCourseDTOInputFaker();
    inscription.startDate = new Date();
    inscription.startDate.setDate(inscription.startDate.getDate() - 5);
    inscription.endDate = new Date();
    inscription.endDate.setDate(inscription.endDate.getDate() + 10);

    const inscriptionCreated = await inscriptionService.create(
      inscription,
      representative.id,
    );

    // Verificar que o status é Approved (porque já começou)
    const before = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(before.actived).toBe(Status.Approved);

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 30);

    await request(app.getHttpServer())
      .patch(`/inscription-course/${inscriptionCreated.id}/extend`)
      .set({ Authorization: `Bearer ${token}` })
      .send({
        endDate: newEndDate,
      })
      .expect(200);

    // Verificar que o status ainda é Approved
    const after = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(after.actived).toBe(Status.Approved);
  });
});
