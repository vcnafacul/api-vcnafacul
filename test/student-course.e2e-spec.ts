import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { ClassService } from 'src/modules/prepCourse/class/class.service';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { GetAllStudentDtoInput } from 'src/modules/prepCourse/studentCourse/dtos/get-all-student.dto.input';
import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { LogStudent } from 'src/modules/prepCourse/studentCourse/log-student/log-student.entity';
import { LogStudentRepository } from 'src/modules/prepCourse/studentCourse/log-student/log-student.repository';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import CreateClassDtoInputFaker from './faker/create-class.dto.input.faker';
import { CreateCoursePeriodDtoInputFaker } from './faker/create-course-period.dto.input.faker';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import createFakeDocxBase64 from './utils/createFakeDocxBase64';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');
jest.mock('src/shared/services/webhooks/discord.ts');

describe('StudentCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let studentCourseService: StudentCourseService;
  let studentCourseRepository: StudentCourseRepository;
  let dataSource: DataSource;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let inscriptionCourseService: InscriptionCourseService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let blobService: BlobService;
  let logStudentRepository: LogStudentRepository;
  let classService: ClassService;
  let coursePeriodService: CoursePeriodService;
  let submissionService: SubmissionService;
  let cacheService: CacheService;
  let logPartnerRepository: LogPartnerRepository;
  let logGeoRepository: LogGeoRepository;

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  const formServiceMock = {
    hasActiveForm: jest.fn().mockResolvedValue(true),
    createFormFull: jest.fn().mockResolvedValue('hashKeyFile'),
    getFormFullByInscriptionId: jest.fn().mockResolvedValue('hashKeyFile'),
    createPartnerForm: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue(discordWebhookMock)
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
    studentCourseService =
      moduleFixture.get<StudentCourseService>(StudentCourseService);
    studentCourseRepository = moduleFixture.get<StudentCourseRepository>(
      StudentCourseRepository,
    );
    dataSource = moduleFixture.get<DataSource>(DataSource);
    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    blobService = moduleFixture.get<BlobService>('BlobService');
    logStudentRepository =
      moduleFixture.get<LogStudentRepository>(LogStudentRepository);
    classService = moduleFixture.get<ClassService>(ClassService);
    coursePeriodService =
      moduleFixture.get<CoursePeriodService>(CoursePeriodService);
    cacheService = moduleFixture.get<CacheService>(CacheService);
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
      .spyOn(emailService, 'sendDeclaredInterest')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendDeclaredInterestBulk')
      .mockImplementation(async () => {});

    jest
      .spyOn(emailService, 'sendConfirmationStudentRegister')
      .mockImplementation(async () => {});

    jest.spyOn(blobService, 'deleteFile').mockImplementation(async () => {
      throw new Error();
    });
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
      .spyOn(studentCourseService['discordWebhook'], 'sendMessage')
      .mockImplementation(async () => {});

    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');

    //mock buffer
    jest.spyOn(cacheService, 'set').mockImplementation(async () => {});

    await app.init();

    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    if (app) await app.close();
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

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );
    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );
    return {
      representative,
      partnerPrepCourse,
      inscription,
      token,
    };
  }

  async function createStudent(inscriptionId: string) {
    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });
    const studentDto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscriptionId,
    );

    return await studentCourseService.create(studentDto);
  }

  async function createClass(userId: string, className?: string) {
    // Primeiro, obter o partnerPrepCourse do usuário
    const partnerPrepCourse =
      await partnerPrepCourseService.getByUserId(userId);
    if (!partnerPrepCourse) {
      throw new Error('Partner prep course not found for user');
    }

    // Criar um período letivo
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const coursePeriod = await coursePeriodService.create(
      coursePeriodDto,
      userId,
    );

    // Criar a turma com o período letivo
    const classDto = CreateClassDtoInputFaker(className);
    classDto.coursePeriodId = coursePeriod.id;

    return await classService.create(classDto, userId);
  }

  async function confirmEnrollmentWithClass(
    studentId: string,
    representativeId: string,
  ) {
    // Cria a turma
    const classEntity = await createClass(representativeId);

    // Confirma a matrícula com o ID da turma
    await studentCourseService.confirmEnrolled(studentId, classEntity.id);

    return classEntity;
  }

  it('should create a new StudentCourse', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, inscription.id);
    dto.rg = '45.678.123-4';

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('cpf invalid', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id);
    dto.cpf = '12345678901';

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('uf invalid', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id);
    dto.uf = 'XX';

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('get all student course by partner course', async () => {
    const { representative, partnerPrepCourse, token } =
      await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    for (let index = 0; index < 10; index++) {
      const userDto = CreateUserDtoInputFaker();
      await userService.create(userDto);
      const user = await userRepository.findOneBy({ email: userDto.email });

      const student = createStudentCourseDTOInputFaker(user.id, inscription.id);
      await studentCourseService.create(student);
    }
    const dto: GetAllStudentDtoInput = {
      partnerPrepCourse: partnerPrepCourse.id,
      page: 1,
      limit: 1000,
    };

    let baseUrl = '/student-course?';

    Object.keys(dto).forEach((key) => {
      baseUrl = baseUrl + `${key}=${dto[key]}&`;
    });

    await request(app.getHttpServer())
      .get(baseUrl)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBe(10);
      });
  }, 100000);

  it('student should enroll in two different prep courses', async () => {
    const repPart1 = await createPartnerPrepCourse();
    const repPart2 = await createPartnerPrepCourse();

    const inscriptionCourseDto1 = CreateInscriptionCourseDTOInputFaker();
    const inscription1 = await inscriptionCourseService.create(
      inscriptionCourseDto1,
      repPart1.representative.id,
    );

    const inscriptionCourseDto2 = CreateInscriptionCourseDTOInputFaker();
    const inscription2 = await inscriptionCourseService.create(
      inscriptionCourseDto2,
      repPart2.representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const student = createStudentCourseDTOInputFaker(user.id, inscription1.id);
    student.rg = '45.678.123-4';

    await request(app.getHttpServer())
      .post('/student-course')
      .send(student)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    student.inscriptionId = inscription2.id;

    return request(app.getHttpServer())
      .post('/student-course')
      .send(student)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      })
      .expect(201);
  }, 30000);

  it('should create a new StudentCourse with legal guardian for minors', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, inscription.id);

    const today = new Date();
    const birthDate = new Date(today.setFullYear(today.getFullYear() - 17));
    dto.birthday = birthDate;

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('should return 400 if a minor does not have a legal guardian', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, inscription.id);
    const today = new Date();
    const birthDate = new Date(today.setFullYear(today.getFullYear() - 17));
    dto.birthday = birthDate;
    dto.legalGuardian = null;

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(
          'The full Legal guardian information is required for minors',
        );
      });
  }, 30000);

  it('has student enrolled without inscription?', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        representative: representative.id,
      },
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .get('/student-course/get-user-info/' + 'has-inscription')
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toContain('Processo Seletivo não encontrado');
      });
  }, 30000);

  it('should return user info', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        representative: representative.id,
      },
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .get('/student-course/get-user-info/' + inscription.id)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toEqual(user.email);
      });
  }, 30000);

  it('already has student enrolled', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        representative: representative.id,
      },
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscriptin = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const dto = createStudentCourseDTOInputFaker(user.id, inscriptin.id);

    await studentCourseService.create(dto);

    return request(app.getHttpServer())
      .get('/student-course/get-user-info/' + inscriptin.id)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toContain(
          'Você já realizou a inscrição neste Processo Seletivo.',
        );
      });
  }, 30000);

  it('should create a user', async () => {
    const userDto = CreateUserDtoInputFaker();

    return request(app.getHttpServer())
      .post('/student-course/user/inscriptionId')
      .send(userDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('should confirm enrollment', async () => {
    const { inscription, token, representative } =
      await createPartnerPrepCourse();

    const { id } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);

    const classEntity = await createClass(representative.id);

    await request(app.getHttpServer())
      .patch(`/student-course/confirm-enrolled/${id}/class/${classEntity.id}`)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
    const updated = await studentCourseService.findOneBy({ id });
    expect(updated.applicationStatus).toBe(StatusApplication.Enrolled);
  });

  it('should upload profile photo student', async () => {
    const { inscription, token } = await createPartnerPrepCourse();

    const { id } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id });
    expect(student.photo).toBeNull();

    await request(app.getHttpServer())
      .patch(`/student-course/profile-image`)
      .send({
        studentId: id,
      })
      .set({
        Authorization: `Bearer ${token}`,
      })
      .attach('profilePhoto', null)
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id });
    expect(updated.photo).toBe('hashKeyFile');
  });

  it('declarar interesse - estudante não existe', async () => {
    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const token = await jwtService.signAsync(
      { user: { id: userStudent.id } },
      { expiresIn: '2h' },
    );

    // Simular arquivos falsos de teste
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');
    const fakePhotoBuffer = Buffer.from('imagem fake');

    const fakeStudentId = 'hashid-not-exist';

    await request(app.getHttpServer())
      .patch(`/student-course/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', fakeStudentId)
      .field('areaInterest', 'Educação') // pode repetir se quiser múltiplos
      .field('selectedCourses', 'História')
      .attach('files', fakeFileBuffer, 'fake.pdf')
      .attach('photo', fakePhotoBuffer, 'fake.jpg')
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('declarar interesse - estudante já declarou interesse', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    // Simular arquivos falsos de teste
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');
    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch(`/student-course/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .field('areaInterest', 'Educação') // pode repetir se quiser múltiplos
      .field('selectedCourses', 'História')
      .attach('files', fakeFileBuffer, 'fake.pdf')
      .attach('photo', fakePhotoBuffer, 'fake.jpg')
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Você já declarou interesse neste Processo Seletivo',
        );
      });
  });

  it('declarar interesse - estudante não convocado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.UnderReview;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    // Simular arquivos falsos de teste
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');
    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch(`/student-course/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .field('areaInterest', 'Educação') // pode repetir se quiser múltiplos
      .field('selectedCourses', 'História')
      .attach('files', fakeFileBuffer, 'fake.pdf')
      .attach('photo', fakePhotoBuffer, 'fake.jpg')
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Apenas estudantes convocados para matricular podem declarar interesse',
        );
      });
  });

  it('declarar interesse - estudante deve declarar interesse', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.CalledForEnrollment;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    // Simular arquivos falsos de teste
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');
    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch(`/student-course/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .field('areaInterest', 'Educação') // pode repetir se quiser múltiplos
      .field('selectedCourses', 'História')
      .attach('files', fakeFileBuffer, 'fake.pdf')
      .attach('photo', fakePhotoBuffer, 'fake.jpg')
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });

    expect(updated.applicationStatus).toBe(StatusApplication.DeclaredInterest);
    expect(updated.photo).toBe('hashKeyFile');
  });

  it('atualizar isfree do estudante que não existe', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: 'hash-not-exist',
      isFree: false,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-is-free`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('só deveria atualizar se o status do estudante for em analise', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.CalledForEnrollment;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      isFree: false,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-is-free`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar informações do estudantes. Status Block',
        );
      });
  });

  it('deveria atualizar se o status do estudante', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id: studentId });

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      isFree: false,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-is-free`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });

    expect(updated.isFree).toBe(false);
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);
  });

  it('selecionar para lista de convocação, estudante não existe', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: 'hash-not-exist',
      enrolled: true,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('selecionar para lista de convocação, estudante já matriculado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.Enrolled;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      enrolled: true,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar status de convocação de estudantes matriculados',
        );
      });
  });

  it('selecionar para lista de convocação, estudante não convocado ou em analise', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.MissedDeadline;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      enrolled: true,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possível alterar informações do estudantes. Status Block',
        );
      });
  });

  it('selecionar para lista de convocação', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    expect(student.selectEnrolled).toBe(false);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      enrolled: true,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(updated.selectEnrolled).toBe(true);

    const dto2 = {
      idStudentCourse: student.id,
      enrolled: false,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto2)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated2 = await studentCourseService.findOneBy({ id: studentId });
    expect(updated2.selectEnrolled).toBe(false);
  });

  it('selecionar para lista de convocação, remove estudante lista de espera', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    expect(student.selectEnrolled).toBe(false);

    await inscriptionCourseService.updateWaitingList(
      inscription.id,
      student.id,
      true,
    );

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(updated.waitingList).toBe(true);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      idStudentCourse: student.id,
      enrolled: true,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/update-select-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated2 = await studentCourseService.findOneBy({ id: studentId });
    expect(updated2.waitingList).toBe(false);
  });

  it('agendando convocação de matrícula, inscrição não encontrada', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      data_start: new Date(),
      data_end: new Date(),
      inscriptionId: 'hash-not-exist',
    };

    await request(app.getHttpServer())
      .post(`/student-course/schedule-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo nao encontrado');
      });
  });

  it('agendando convocação de matrícula, sem estudantes', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const startDate = new Date();
    const endDate = new Date();

    const dto = {
      data_start: startDate,
      data_end: endDate,
      inscriptionId: inscription.id,
    };

    await request(app.getHttpServer())
      .post(`/student-course/schedule-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Nenhum estudante selecionado');
      });
  });

  it('agendando convocação de matrícula', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.selectEnrolled = true;
    await studentCourseRepository.update(student);

    const { id } = await createStudent(inscription.id);
    const student2 = await studentCourseService.findOneBy({ id });
    student2.selectEnrolled = true;
    await studentCourseRepository.update(student2);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2);

    const dto = {
      data_start: startDate,
      data_end: endDate,
      inscriptionId: inscription.id,
    };

    await request(app.getHttpServer())
      .post(`/student-course/schedule-enrolled`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(
      updated.selectEnrolledAt.getTime() - startDate.getTime(),
    ).toBeLessThanOrEqual(1000);
    expect(
      updated.limitEnrolledAt.getTime() - endDate.getTime(),
    ).toBeLessThanOrEqual(1000);
    expect(updated.selectEnrolled).toBe(false);
    expect(updated.applicationStatus).toBe(
      StatusApplication.CalledForEnrollment,
    );

    const updated2 = await studentCourseService.findOneBy({ id });
    expect(
      updated2.selectEnrolledAt.getTime() - startDate.getTime(),
    ).toBeLessThanOrEqual(1000);
    expect(
      updated2.limitEnrolledAt.getTime() - endDate.getTime(),
    ).toBeLessThanOrEqual(1000);
    expect(updated2.selectEnrolled).toBe(false);
    expect(updated2.applicationStatus).toBe(
      StatusApplication.CalledForEnrollment,
    );
  });

  it('reset de estudante, estudante nao encontrado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId: 'hash-not-exist',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reset-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('reset de estudante já matriculado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.Enrolled;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reset-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possivel resetar estudante matriculado',
        );
      });
  });

  it('reset de estudante', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.selectEnrolled = true;
    student.isFree = false;
    student.selectEnrolledAt = new Date();
    student.selectEnrolledAt.setDate(student.selectEnrolledAt.getDate() + 1);
    student.limitEnrolledAt = new Date();
    student.limitEnrolledAt.setDate(student.limitEnrolledAt.getDate() + 2);
    await studentCourseRepository.update(student);

    await inscriptionCourseService.updateWaitingList(
      inscription.id,
      studentId,
      true,
    );

    const updatedWaiting = await studentCourseService.findOneBy({
      id: studentId,
    });
    expect(updatedWaiting.waitingList).toBe(true);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reset-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(updated.applicationStatus).toBe(StatusApplication.UnderReview);
    expect(updated.selectEnrolled).toBe(false);
    expect(updated.isFree).toBe(true);
    expect(updated.selectEnrolledAt).toBeNull();
    expect(updated.limitEnrolledAt).toBeNull();
    expect(updated.waitingList).toBe(false);
  });

  it('reject de estudante, estudante nao encontrado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId: 'hash-not-exist',
      reason: 'motivo',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reject-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('reject de estudante, já matriculado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.Enrolled;
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId,
      reason: 'motivo',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reject-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Não é possivel rejeitar estudante matriculado',
        );
      });
  });

  it('reject de estudante', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      studentId,
      reason: 'motivo',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/reject-student`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(updated.applicationStatus).toBe(StatusApplication.Rejected);
  });

  it('verifica declaração de interesse, inscrição não existe', async () => {
    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const token = await jwtService.signAsync(
      { user: { id: userStudent.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/hash-not-exist`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  });

  it('verificr declaração de interesse', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userStudentDto = await CreateUserDtoInputFaker();
    await userService.create(userStudentDto);
    const userStudent = await userRepository.findOneBy({
      email: userStudentDto.email,
    });

    const token = await jwtService.signAsync(
      { user: { id: userStudent.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('verificr declaração de interesse, applicationStatus === UnderReview', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('requestDocuments');
        expect(res.body.requestDocuments).toBe(false); //default
        expect(res.body).toHaveProperty('convocated');
        expect(res.body.convocated).toBe(false);
        expect(res.body).toHaveProperty('declared');
        expect(res.body.declared).toBe(false);
        expect(res.body).toHaveProperty('expired');
        expect(res.body.expired).toBe(true);
        expect(res.body).toHaveProperty('studentId');
        expect(res.body.studentId).toBe(studentId);
        expect(res.body).toHaveProperty('isFree');
        expect(res.body.isFree).toBe(true);
      });
  });

  it('verificr declaração de interesse, applicationStatus === DeclaredInterest', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionCourseDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    student.limitEnrolledAt = new Date();
    student.limitEnrolledAt.setDate(student.limitEnrolledAt.getDate() + 1);
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('requestDocuments');
        expect(res.body.requestDocuments).toBe(true); //default
        expect(res.body).toHaveProperty('convocated');
        expect(res.body.convocated).toBe(false);
        expect(res.body).toHaveProperty('declared');
        expect(res.body.declared).toBe(true);
        expect(res.body).toHaveProperty('expired');
        expect(res.body.expired).toBe(false);
        expect(res.body).toHaveProperty('studentId');
        expect(res.body.studentId).toBe(studentId);
        expect(res.body).toHaveProperty('isFree');
        expect(res.body.isFree).toBe(true);
      });
  });

  it('verificar declaração de interesse - estudante matriculado (Enrolled)', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.Enrolled;
    student.limitEnrolledAt = new Date(Date.now() + 86400000); // amanhã
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.declared).toBe(true);
        expect(res.body.convocated).toBe(false);
        expect(res.body.expired).toBe(false);
      });
  });

  it('verificar declaração de interesse - convocado (CalledForEnrollment), dentro do prazo', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.limitEnrolledAt = new Date(Date.now() + 86400000); // amanhã
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.declared).toBe(false);
        expect(res.body.convocated).toBe(true);
        expect(res.body.expired).toBe(false);
      });
  });

  it('verificar declaração de interesse - convocado (CalledForEnrollment), prazo expirado', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.limitEnrolledAt = new Date(Date.now() - 86400000); // ontem
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body.declared).toBe(false);
        expect(res.body.convocated).toBe(true);
        expect(res.body.expired).toBe(true);
      });
  });

  it('envio de email de declaração de interesse por id, estudante não existe', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .get(`/student-course/hash-not-exist-student/declared-interest/`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  });

  it('não deve enviar email se já foi enviado recentemente', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.selectEnrolledAt = new Date(Date.now() - 86400000); // ontem
    student.limitEnrolledAt = new Date(Date.now() + 86400000); // amanhã
    await studentCourseRepository.update(student);

    // Cria log recente (< 1 hora atrás)
    const log = new LogStudent();
    log.studentId = studentId;
    log.description = 'Email de convocação enviado';
    log.applicationStatus = StatusApplication.CalledForEnrollment;
    log.createdAt = new Date(); // agora
    await logStudentRepository.create(log);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
      expiresIn: '2h',
    });

    await request(app.getHttpServer())
      .get(`/student-course/${studentId}/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Email enviado recentemente');
      });
  });

  it('deve enviar email se não há log recente', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });

    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.selectEnrolledAt = new Date(Date.now() - 86400000); // ontem
    student.limitEnrolledAt = new Date(Date.now() + 86400000); // amanhã
    await studentCourseRepository.update(student);

    // log antigo (2 horas atrás)
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const log = new LogStudent();
    log.studentId = student.id;
    log.description = 'Email de convocação enviado';
    log.applicationStatus = StatusApplication.CalledForEnrollment;
    log.createdAt = oldDate;
    await logStudentRepository.create(log);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
      expiresIn: '2h',
    });

    await request(app.getHttpServer())
      .get(`/student-course/${student.id}/declared-interest`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // opcional: verifica se o log foi criado
    const logs = await logStudentRepository.findAllBy({
      page: 1,
      limit: 9999,
      where: { studentId: student.id },
    });
    const hasNewLog = logs.data.some(
      (l) =>
        l.description === 'Email de convocação enviado' &&
        l.createdAt.getTime() > oldDate.getTime(),
    );
    expect(hasNewLog).toBe(true);
  });

  it('deve enviar emails em lote e registrar logs corretamente por curso e data limite', async () => {
    const { representative } = await createPartnerPrepCourse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const course1 = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );
    const course2 = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const createStudentsForCourse = async (
      course: typeof course1,
      deadline: Date,
      count: number,
    ) => {
      const createdIds: string[] = [];

      for (let i = 0; i < count; i++) {
        const { id: studentId } = await createStudent(course.id);
        const student = await studentCourseService.findOneBy({ id: studentId });

        student.applicationStatus = StatusApplication.CalledForEnrollment;
        student.limitEnrolledAt = deadline;
        student.selectEnrolledAt = today;
        await studentCourseRepository.update(student);

        createdIds.push(studentId);
      }

      return createdIds;
    };

    const studentsCourse1Today = await createStudentsForCourse(
      course1,
      today,
      3,
    );
    const studentsCourse2Tomorrow = await createStudentsForCourse(
      course2,
      tomorrow,
      2,
    );

    await studentCourseService.sendEmailDeclaredInterest();

    // Verifica se os logs foram criados corretamente
    const allStudentIds = [...studentsCourse1Today, ...studentsCourse2Tomorrow];
    const logs = await logStudentRepository.findAllBy({
      page: 1,
      limit: 9999,
    });

    for (const id of allStudentIds) {
      const log = logs.data.find(
        (l) =>
          l.studentId === id &&
          l.description === 'Email de convocação enviado (em lote)',
      );
      expect(log).toBeDefined();
    }
  }, 100000);

  it('deve registrar matrícula perdida para estudantes que não confirmaram no prazo', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId1 } = await createStudent(inscription.id);
    const { id: studentId2 } = await createStudent(inscription.id);

    // Ambos os estudantes perderam o prazo
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 2);

    const student1 = await studentCourseService.findOneBy({ id: studentId1 });
    const student2 = await studentCourseService.findOneBy({ id: studentId2 });

    student1.applicationStatus = StatusApplication.CalledForEnrollment;
    student1.limitEnrolledAt = expiredDate;
    student2.applicationStatus = StatusApplication.CalledForEnrollment;
    student2.limitEnrolledAt = expiredDate;
    await studentCourseRepository.update(student1);
    await studentCourseRepository.update(student2);

    await studentCourseService.verifyLostEnrolled();

    const logs1 = await logStudentRepository.findAllBy({
      page: 1,
      limit: 9999,
      where: { studentId: studentId1 },
    });

    const logs2 = await logStudentRepository.findAllBy({
      page: 1,
      limit: 9999,
      where: { studentId: studentId2 },
    });

    const log1 = logs1.data.find(
      (log) =>
        log.studentId === studentId1 &&
        log.description === 'Matrícula perdida' &&
        log.applicationStatus === StatusApplication.MissedDeadline,
    );
    const log2 = logs2.data.find(
      (log) =>
        log.studentId === studentId2 &&
        log.description === 'Matrícula perdida' &&
        log.applicationStatus === StatusApplication.MissedDeadline,
    );

    expect(log1).toBeDefined();
    expect(log2).toBeDefined();
  }, 100000);

  it('deve enviar alerta no Discord se falhar ao registrar algum log de matrícula perdida', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId1 } = await createStudent(inscription.id);

    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 2);

    const student1 = await studentCourseService.findOneBy({ id: studentId1 });

    student1.applicationStatus = StatusApplication.CalledForEnrollment;
    student1.limitEnrolledAt = expiredDate;
    await studentCourseRepository.update(student1);

    const spy = jest
      .spyOn(studentCourseService['logStudentRepository'], 'create')
      .mockImplementation(async () => {
        throw new Error('Falha no log');
      });

    await studentCourseService.verifyLostEnrolled();

    expect(discordWebhookMock.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`ID: ${studentId1}`),
    );

    // Restore mock
    spy.mockRestore();
  }, 100000);

  it('tenta atualizar turma de estudante, estudante não existe', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync({
      user: { id: representative.id },
      expiresIn: '2h',
    });

    const dto = {
      studentId: 'hash-not-exist',
      classId: 'hash-not-exist',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/class`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Estudante não encontrado');
      });
  }, 100000);

  it('tenta atualizar turma de estudante, turma não existe', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
      expiresIn: '2h',
    });

    const dto = {
      studentId: studentId,
      classId: 'hash-not-exist',
    };

    await request(app.getHttpServer())
      .patch(`/student-course/class`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Turma não encontrada');
      });
  }, 100000);

  it('tenta atualizar turma de estudante, adiciona turma', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
      expiresIn: '2h',
    });

    const classEntity = await createClass(representative.id);

    const dto = {
      studentId: studentId,
      classId: classEntity.id,
    };

    await request(app.getHttpServer())
      .patch(`/student-course/class`)
      .send(dto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: studentId });
    expect(updated.class.id).toBe(classEntity.id);
  }, 100000);

  it('deve retornar estudantes paginados', async () => {
    // 1. Cria representante e token
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    // 2. Cria processo seletivo vinculado
    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    // 3. Cria estudantes com código de matrícula
    for (let i = 0; i < 3; i++) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
    }

    // 4. Faz chamada à rota sem filtro nem ordenação
    const response = await request(app.getHttpServer())
      .get('/student-course/enrolled?inscriptionId=' + inscription.id)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // 5. Valida estrutura da resposta
    expect(response.body).toHaveProperty('students.data');
    expect(Array.isArray(response.body.students.data)).toBe(true);
    expect(response.body.students.data.length).toBe(3);
    expect(response.body.students).toHaveProperty('page', 1);
    expect(response.body.students).toHaveProperty('limit', 30);
    expect(response.body.students).toHaveProperty('totalItems', 3);

    // 6. Valida campos essenciais de um estudante retornado
    const student = response.body.students.data[0];
    expect(student).toHaveProperty('id');
    expect(student).toHaveProperty('name');
    expect(student).toHaveProperty('email');
    expect(student).toHaveProperty('cod_enrolled');
    expect(student).toHaveProperty('applicationStatus');
    expect(student).toHaveProperty('class');
  }, 100000);

  //Filter: field, value, operator - Sort: field, sort - expected
  test.each([
    ['class', faker.company.name(), null, null, null, 1],
    ['birthday', new Date('1999-01-01'), 'after', null, null, 2],
  ])(
    'deve retornar estudantes paginados com filtro e ordenação',
    async (field, value, operator, order, sort, expected) => {
      // 1. Cria representante e token
      const { representative } = await createPartnerPrepCourse();

      const inscription = await inscriptionCourseService.create(
        CreateInscriptionCourseDTOInputFaker(),
        representative.id,
      );

      const { id: studentId } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id: studentId });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);

      const user1 = await userService.findOneBy({ id: student.userId });
      user1.birthday = new Date('2000-01-01');
      await userRepository.update(user1);

      if (field === 'class') {
        const classEntity = await createClass(
          representative.id,
          value as string,
        );
        await studentCourseService.updateClass(student.id, classEntity.id);
      }

      const { id: studentId2 } = await createStudent(inscription.id);
      const student2 = await studentCourseService.findOneBy({ id: studentId2 });
      student2.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student2);
      await confirmEnrollmentWithClass(student2.id, representative.id);

      const user2 = await userService.findOneBy({ id: student2.userId });
      user2.birthday = new Date('2000-01-01');
      await userRepository.update(user2);

      const token = await jwtService.signAsync({
        user: { id: representative.id },
        expiresIn: '2h',
      });

      const filterValue =
        value instanceof Date ? value.toISOString().slice(0, 10) : value;
      let url = `/student-course/enrolled?filter[field]=${field}&filter[value]=${encodeURIComponent(filterValue)}`;
      if (operator) {
        url += `&filter[operator]=${operator}`;
      }
      if (order) {
        url += `&sort[${sort}]=${order}`;
      }
      url += `&inscriptionId=${inscription.id}`;

      const response = await request(app.getHttpServer())
        .get(url)
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);

      // 5. Valida estrutura da resposta
      expect(response.body).toHaveProperty('students.data');
      expect(Array.isArray(response.body.students.data)).toBe(true);
      expect(response.body.students.data.length).toBe(expected);
    },
  );

  it('deve rejeitar filtro com campo fora da whitelist', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await confirmEnrollmentWithClass(student.id, representative.id);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const payload = encodeURIComponent('id" OR "1"="1');

    await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?filter[field]=${payload}&filter[value]=x&inscriptionId=${inscription.id}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 100000);

  it('deve tratar valor de filtro com aspas como texto literal, sem quebrar a query', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await confirmEnrollmentWithClass(student.id, representative.id);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const payload = encodeURIComponent('%" OR "1"="1');

    const response = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?filter[field]=cpf&filter[value]=${payload}&inscriptionId=${inscription.id}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.students.data.length).toBe(0);
  }, 100000);

  it('deve filtrar por CPF corretamente (caso positivo do ramo da whitelist)', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await confirmEnrollmentWithClass(student.id, representative.id);

    const { id: studentId2 } = await createStudent(inscription.id);
    const student2 = await studentCourseService.findOneBy({ id: studentId2 });
    student2.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student2);
    await confirmEnrollmentWithClass(student2.id, representative.id);

    const firstStudent = await studentCourseService.findOneBy({
      id: studentId,
    });

    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const payload = encodeURIComponent(firstStudent.cpf);

    const response = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?filter[field]=cpf&filter[value]=${payload}&inscriptionId=${inscription.id}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.students.data.length).toBe(1);
    expect(response.body.students.data[0].id).toBe(firstStudent.id);
  }, 100000);

  // ========================
  // Testes de declaração por etapa
  // ========================

  async function createCalledStudent(inscriptionId: string) {
    const { id: studentId } = await createStudent(inscriptionId);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.CalledForEnrollment;
    student.limitEnrolledAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    student.selectEnrolledAt = new Date();
    await studentCourseRepository.update(student);

    const token = await jwtService.signAsync(
      { user: { id: student.userId } },
      { expiresIn: '2h' },
    );

    return { student, token, studentId };
  }

  it('declaração por etapa - submitDocuments com requestDocuments=true', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-documents')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('files', fakeFileBuffer, 'doc.pdf')
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.documentsDone).toBe(true);
  }, 30000);

  it('declaração por etapa - submitDocuments impede reenvio', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.documentsDone = true;
    await studentCourseRepository.update(student);

    const fakeFileBuffer = Buffer.from('conteúdo fake');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-documents')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('files', fakeFileBuffer, 'doc.pdf')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Documentos já foram enviados');
      });
  }, 30000);

  it('declaração por etapa - submitDocuments rejeita se requestDocuments=false', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = false;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    const fakeFileBuffer = Buffer.from('conteúdo fake');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-documents')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('files', fakeFileBuffer, 'doc.pdf')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'Este processo seletivo não exige documentos',
        );
      });
  }, 30000);

  it('declaração por etapa - submitPhoto', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-photo')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('photo', fakePhotoBuffer, 'photo.jpg')
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.photoDone).toBe(true);
    expect(updated.photo).toBe('hashKeyFile');
  }, 30000);

  it('declaração por etapa - submitPhoto impede reenvio', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.photoDone = true;
    await studentCourseRepository.update(student);

    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-photo')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('photo', fakePhotoBuffer, 'photo.jpg')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Foto já foi enviada');
      });
  }, 30000);

  it('declaração por etapa - submitPhoto exige documentos antes se requestDocuments=true', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    const fakePhotoBuffer = Buffer.from('imagem fake');

    await request(app.getHttpServer())
      .patch('/student-course/declaration-photo')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('photo', fakePhotoBuffer, 'photo.jpg')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'É necessário enviar os documentos antes da foto',
        );
      });
  }, 30000);

  it('declaração por etapa - submitSurvey', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.photoDone = true;
    await studentCourseRepository.update(student);

    await request(app.getHttpServer())
      .patch('/student-course/declaration-survey')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        studentId: student.id,
        areaInterest: ['Matematica', 'Fisica'],
        selectedCourses: ['Engenharia', 'Medicina'],
      })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.surveyDone).toBe(true);
    expect(JSON.parse(updated.areaInterest)).toEqual(['Matematica', 'Fisica']);
  }, 30000);

  it('declaração por etapa - submitSurvey exige foto antes', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    await request(app.getHttpServer())
      .patch('/student-course/declaration-survey')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        studentId: student.id,
        areaInterest: ['Matematica'],
        selectedCourses: ['Engenharia'],
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'É necessário enviar a foto antes da pesquisa',
        );
      });
  }, 30000);

  it('declaração por etapa - confirmDeclaration completa', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.photoDone = true;
    student.surveyDone = true;
    await studentCourseRepository.update(student);

    await request(app.getHttpServer())
      .patch('/student-course/declaration-confirm')
      .set({ Authorization: `Bearer ${token}` })
      .send({ studentId: student.id })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.applicationStatus).toBe(StatusApplication.DeclaredInterest);
  }, 30000);

  it('declaração por etapa - confirmDeclaration falha sem etapas completas', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    await request(app.getHttpServer())
      .patch('/student-course/declaration-confirm')
      .set({ Authorization: `Bearer ${token}` })
      .send({ studentId: student.id })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'É necessário completar todas as etapas antes de confirmar',
        );
      });
  }, 30000);

  it('declaração por etapa - confirmDeclaration falha sem documentos quando exigidos', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.photoDone = true;
    student.surveyDone = true;
    await studentCourseRepository.update(student);

    await request(app.getHttpServer())
      .patch('/student-course/declaration-confirm')
      .set({ Authorization: `Bearer ${token}` })
      .send({ studentId: student.id })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'É necessário enviar os documentos antes de confirmar',
        );
      });
  }, 30000);

  it('declaração por etapa - verifyDeclaredInterest retorna campos de progresso', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);
    student.documentsDone = true;
    student.photoDone = true;
    await studentCourseRepository.update(student);

    await request(app.getHttpServer())
      .get(`/student-course/declared-interest/${inscription.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('documentsDone', true);
        expect(res.body).toHaveProperty('photoDone', true);
        expect(res.body).toHaveProperty('surveyDone', false);
      });
  }, 30000);

  it('declaração por etapa - fluxo completo sem documentos', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    // Etapa 1: foto
    const fakePhotoBuffer = Buffer.from('imagem fake');
    await request(app.getHttpServer())
      .patch('/student-course/declaration-photo')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('photo', fakePhotoBuffer, 'photo.jpg')
      .expect(200);

    // Etapa 2: pesquisa
    await request(app.getHttpServer())
      .patch('/student-course/declaration-survey')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        studentId: student.id,
        areaInterest: ['Historia'],
        selectedCourses: ['Direito'],
      })
      .expect(200);

    // Etapa 3: confirmação
    await request(app.getHttpServer())
      .patch('/student-course/declaration-confirm')
      .set({ Authorization: `Bearer ${token}` })
      .send({ studentId: student.id })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.applicationStatus).toBe(StatusApplication.DeclaredInterest);
    expect(updated.photoDone).toBe(true);
    expect(updated.surveyDone).toBe(true);
  }, 60000);

  it('declaração por etapa - fluxo completo com documentos', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.requestDocuments = true;
    const inscription = await inscriptionCourseService.create(
      inscriptionDto,
      representative.id,
    );

    const { student, token } = await createCalledStudent(inscription.id);

    // Etapa 1: documentos
    const fakeFileBuffer = Buffer.from('conteúdo fake de um arquivo pdf');
    await request(app.getHttpServer())
      .patch('/student-course/declaration-documents')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('files', fakeFileBuffer, 'doc.pdf')
      .expect(200);

    // Etapa 2: foto
    const fakePhotoBuffer = Buffer.from('imagem fake');
    await request(app.getHttpServer())
      .patch('/student-course/declaration-photo')
      .set({ Authorization: `Bearer ${token}` })
      .field('studentId', student.id)
      .attach('photo', fakePhotoBuffer, 'photo.jpg')
      .expect(200);

    // Etapa 3: pesquisa
    await request(app.getHttpServer())
      .patch('/student-course/declaration-survey')
      .set({ Authorization: `Bearer ${token}` })
      .send({
        studentId: student.id,
        areaInterest: ['Matematica', 'Fisica'],
        selectedCourses: ['Engenharia'],
      })
      .expect(200);

    // Etapa 4: confirmação
    await request(app.getHttpServer())
      .patch('/student-course/declaration-confirm')
      .set({ Authorization: `Bearer ${token}` })
      .send({ studentId: student.id })
      .expect(200);

    const updated = await studentCourseService.findOneBy({ id: student.id });
    expect(updated.applicationStatus).toBe(StatusApplication.DeclaredInterest);
    expect(updated.documentsDone).toBe(true);
    expect(updated.photoDone).toBe(true);
    expect(updated.surveyDone).toBe(true);
  }, 60000);

  it('deve listar todos os estudantes do cursinho sem inscriptionId', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscriptionA = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );
    const inscriptionB = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    for (const inscription of [inscriptionA, inscriptionB]) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
    }

    const response = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.students.totalItems).toBe(2);
    expect(response.body.students.data.length).toBe(2);
  }, 100000);

  it('deve filtrar estudantes por status de matrícula', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
      ids.push(student.id);
    }

    const cancelled = await studentCourseService.findOneBy({ id: ids[0] });
    cancelled.applicationStatus = StatusApplication.EnrollmentCancelled;
    await studentCourseRepository.update(cancelled);

    const closed = await studentCourseService.findOneBy({ id: ids[1] });
    closed.applicationStatus = StatusApplication.EnrollmentClosed;
    await studentCourseRepository.update(closed);

    const todos = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(todos.body.students.totalItems).toBe(3);
    expect(todos.body.students.data.length).toBe(3);

    const matriculados = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?applicationStatus=${encodeURIComponent(
          StatusApplication.Enrolled,
        )}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(matriculados.body.students.totalItems).toBe(1);
    expect(matriculados.body.students.data.length).toBe(1);

    const canceladas = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?applicationStatus=${encodeURIComponent(
          StatusApplication.EnrollmentCancelled,
        )}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(canceladas.body.students.totalItems).toBe(1);
    expect(canceladas.body.students.data.length).toBe(1);

    const encerradas = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?applicationStatus=${encodeURIComponent(
          StatusApplication.EnrollmentClosed,
        )}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(encerradas.body.students.totalItems).toBe(1);
    expect(encerradas.body.students.data.length).toBe(1);
  }, 100000);

  it('deve rejeitar status de matrícula inválido', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    await request(app.getHttpServer())
      .get('/student-course/enrolled?applicationStatus=Inexistente')
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 100000);

  it('deve filtrar estudantes por ano letivo da turma', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await confirmEnrollmentWithClass(student.id, representative.id);

    const enrolled = await studentCourseService.findOneBy({ id: studentId });
    const year = enrolled.class.coursePeriod.year;

    const doAno = await request(app.getHttpServer())
      .get(`/student-course/enrolled?year=${year}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(doAno.body.students.totalItems).toBe(1);

    const outroAno = await request(app.getHttpServer())
      .get(`/student-course/enrolled?year=${year + 50}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(outroAno.body.students.totalItems).toBe(0);
    expect(outroAno.body.students.data.length).toBe(0);
  }, 100000);

  it('deve retornar o processo seletivo do estudante e o id do cursinho', async () => {
    const { representative, partnerPrepCourse } =
      await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const dtoInscription = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      dtoInscription,
      representative.id,
    );

    const { id: studentId } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id: studentId });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);
    await confirmEnrollmentWithClass(student.id, representative.id);

    const response = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const row = response.body.students.data[0];
    expect(row.inscriptionCourse).toBeDefined();
    expect(row.inscriptionCourse.id).toBe(inscription.id);
    expect(row.inscriptionCourse.name).toBe(dtoInscription.name);
    expect(response.body.partnerId).toBe(partnerPrepCourse.id);
  }, 100000);

  it('não deve listar estudantes com deletedAt preenchido', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
      ids.push(student.id);
    }

    const deleted = await studentCourseService.findOneBy({ id: ids[0] });
    deleted.deletedAt = new Date();
    await studentCourseRepository.update(deleted);

    const response = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body.students.totalItems).toBe(1);
    expect(response.body.students.data.length).toBe(1);
    expect(response.body.students.data[0].id).toBe(ids[1]);
  }, 100000);

  it('deve retornar os anos letivos distintos do cursinho em ordem decrescente', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const anos = [2024, 2026, 2024, 2025];
    for (const ano of anos) {
      const dto = CreateCoursePeriodDtoInputFaker();
      dto.name = `Período ${ano}`;
      dto.startDate = new Date(`${ano}-02-01`);
      dto.endDate = new Date(`${ano}-11-30`);
      await coursePeriodService.create(dto, representative.id);
    }

    const response = await request(app.getHttpServer())
      .get('/course-period/years')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(response.body).toEqual([2026, 2025, 2024]);
  }, 100000);
  it('deve listar matriculados e discrimina por processo seletivo', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscriptionA = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );
    const inscriptionB = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const idsPorInscricao: Record<string, string> = {};
    for (const inscription of [inscriptionA, inscriptionB]) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
      idsPorInscricao[inscription.id] = student.id;
    }

    const todos = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(todos.body.students.totalItems).toBe(2);
    expect(todos.body.students.data.length).toBe(2);

    const somenteA = await request(app.getHttpServer())
      .get(`/student-course/enrolled?inscriptionId=${inscriptionA.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(somenteA.body.students.totalItems).toBe(1);
    expect(somenteA.body.students.data.length).toBe(1);
    expect(somenteA.body.students.data[0].id).toBe(
      idsPorInscricao[inscriptionA.id],
    );
    expect(somenteA.body.students.data[0].inscriptionCourse.id).toBe(
      inscriptionA.id,
    );

    const somenteB = await request(app.getHttpServer())
      .get(`/student-course/enrolled?inscriptionId=${inscriptionB.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(somenteB.body.students.totalItems).toBe(1);
    expect(somenteB.body.students.data.length).toBe(1);
    expect(somenteB.body.students.data[0].id).toBe(
      idsPorInscricao[inscriptionB.id],
    );
    expect(somenteB.body.students.data[0].inscriptionCourse.id).toBe(
      inscriptionB.id,
    );
  }, 100000);

  it('deve retornar 404 para processo seletivo inexistente', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    await request(app.getHttpServer())
      .get(
        '/student-course/enrolled?inscriptionId=00000000-0000-0000-0000-000000000000',
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Processo Seletivo não encontrado');
      });
  }, 100000);

  it('deve aplicar os filtros combinados de processo seletivo, ano letivo e status', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representative.id);
      ids.push(student.id);
    }

    const cancelled = await studentCourseService.findOneBy({ id: ids[0] });
    cancelled.applicationStatus = StatusApplication.EnrollmentCancelled;
    await studentCourseRepository.update(cancelled);

    const closed = await studentCourseService.findOneBy({ id: ids[1] });
    closed.applicationStatus = StatusApplication.EnrollmentClosed;
    await studentCourseRepository.update(closed);

    // ids[2] segue como Matriculado
    const matriculado = await studentCourseService.findOneBy({ id: ids[2] });
    expect(matriculado.applicationStatus).toBe(StatusApplication.Enrolled);
    const year = matriculado.class.coursePeriod.year;

    const combinado = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?inscriptionId=${inscription.id}&year=${year}` +
          `&applicationStatus=${encodeURIComponent(StatusApplication.Enrolled)}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(combinado.body.students.totalItems).toBe(1);
    expect(combinado.body.students.data.length).toBe(1);
    expect(combinado.body.students.data[0].id).toBe(ids[2]);
    expect(combinado.body.students.data[0].inscriptionCourse.id).toBe(
      inscription.id,
    );

    const anoErrado = await request(app.getHttpServer())
      .get(
        `/student-course/enrolled?inscriptionId=${inscription.id}&year=${year + 50}` +
          `&applicationStatus=${encodeURIComponent(StatusApplication.Enrolled)}`,
      )
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(anoErrado.body.students.totalItems).toBe(0);
    expect(anoErrado.body.students.data.length).toBe(0);
  }, 100000);

  it('não deve listar estudante sem turma quando um ano letivo é selecionado', async () => {
    const { representative } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const inscription = await inscriptionCourseService.create(
      CreateInscriptionCourseDTOInputFaker(),
      representative.id,
    );

    // Mesma turma para os dois primeiros, garantindo o mesmo ano letivo
    const classEntity = await createClass(representative.id);

    const comTurma: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await studentCourseService.confirmEnrolled(student.id, classEntity.id);
      comTurma.push(student.id);
    }

    // Terceiro estudante fica com cod_enrolled preenchido, porém sem turma
    const { id: semTurmaId } = await createStudent(inscription.id);
    const semTurma = await studentCourseService.findOneBy({ id: semTurmaId });
    semTurma.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(semTurma);
    await studentCourseService.confirmEnrolled(semTurma.id, classEntity.id);

    const paraDesvincular = await studentCourseService.findOneBy({
      id: semTurmaId,
    });
    paraDesvincular.class = null;
    await studentCourseRepository.update(paraDesvincular);

    const desvinculado = await studentCourseService.findOneBy({
      id: semTurmaId,
    });
    expect(desvinculado.class).toBeNull();
    expect(desvinculado.cod_enrolled).not.toBeNull();

    const comTurmaCarregado = await studentCourseService.findOneBy({
      id: comTurma[0],
    });
    const year = comTurmaCarregado.class.coursePeriod.year;

    const semFiltro = await request(app.getHttpServer())
      .get('/student-course/enrolled')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(semFiltro.body.students.totalItems).toBe(3);
    expect(semFiltro.body.students.data.length).toBe(3);
    expect(
      semFiltro.body.students.data.map((student) => student.id).sort(),
    ).toEqual([...comTurma, semTurmaId].sort());

    const comAno = await request(app.getHttpServer())
      .get(`/student-course/enrolled?year=${year}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(comAno.body.students.totalItems).toBe(2);
    expect(comAno.body.students.data.length).toBe(2);
    expect(
      comAno.body.students.data.map((student) => student.id).sort(),
    ).toEqual([...comTurma].sort());
  }, 100000);
  async function baixarExportacao(token: string, query = '') {
    const response = await request(app.getHttpServer())
      .get(`/student-course/enrolled/export${query}`)
      .set({ Authorization: `Bearer ${token}` })
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body);
    const sheet = workbook.worksheets[0];

    const linhas: string[][] = [];
    sheet.eachRow((row) => linhas.push(row.values as string[]));
    return { header: linhas[0], rows: linhas.slice(1) };
  }

  async function matricularEstudantes(
    representativeId: string,
    inscriptionId: string,
    quantidade: number,
  ) {
    const ids: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      const { id } = await createStudent(inscriptionId);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await confirmEnrollmentWithClass(student.id, representativeId);
      ids.push(student.id);
    }
    return ids;
  }

  it('export deve trazer todos os estudantes filtrados, e nao so a primeira pagina', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    await matricularEstudantes(representative.id, inscription.id, 3);

    // limit=1 na listagem para deixar explicito que a exportacao ignora a
    // paginacao da tela
    const listagem = await request(app.getHttpServer())
      .get('/student-course/enrolled?page=1&limit=1')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    expect(listagem.body.students.data).toHaveLength(1);
    expect(listagem.body.students.totalItems).toBe(3);

    const { header, rows } = await baixarExportacao(token);
    expect(header[1]).toBe('Nº de matrícula');
    expect(rows).toHaveLength(3);
  }, 100000);

  it('export deve respeitar a mascara de email, telefone e cpf do papel', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    await matricularEstudantes(representative.id, inscription.id, 1);

    // o representante do fixture usa o papel admin, que ve tudo em claro
    const tokenAdmin = await jwtService.signAsync({
      user: { id: representative.id },
    });
    // localiza pelo cabecalho, e nao por indice fixo: a ordem das colunas
    // passou a vir do agrupamento do catalogo e pode mudar
    const valor = (
      resultado: { header: string[]; rows: string[][] },
      rotulo: string,
    ) => resultado.rows[0][resultado.header.indexOf(rotulo)];

    const comAdmin = await baixarExportacao(tokenAdmin);
    expect(valor(comAdmin, 'Email (conta)')).not.toContain('*');
    expect(valor(comAdmin, 'CPF')).not.toContain('*');

    // mesmo usuario, papel reduzido a visualizarEstudantes
    const papelRestrito = new CreateRoleDtoInput();
    papelRestrito.name = `export_visualizar_${Date.now()}`;
    papelRestrito.visualizarEstudantes = true;
    const role = await roleService.create(papelRestrito);
    representative.role = role;
    await userRepository.update(representative);

    const tokenRestrito = await jwtService.signAsync({
      user: { id: representative.id },
    });
    const comRestrito = await baixarExportacao(tokenRestrito);

    // email, telefone e cpf mascarados — o vazamento aqui seria em arquivo
    expect(valor(comRestrito, 'Email (conta)')).toContain('*');
    expect(valor(comRestrito, 'WhatsApp')).toContain('*');
    expect(valor(comRestrito, 'CPF')).toContain('*');
  }, 100000);

  it('export nao deve trazer estudante de outro cursinho', async () => {
    const cursinhoA = await createPartnerPrepCourse();
    const cursinhoB = await createPartnerPrepCourse();

    await matricularEstudantes(
      cursinhoA.representative.id,
      cursinhoA.inscription.id,
      2,
    );
    await matricularEstudantes(
      cursinhoB.representative.id,
      cursinhoB.inscription.id,
      3,
    );

    const token = await jwtService.signAsync({
      user: { id: cursinhoA.representative.id },
    });
    const { rows } = await baixarExportacao(token);
    expect(rows).toHaveLength(2);
  }, 100000);
  function resetar(token: string, studentId: string) {
    return request(app.getHttpServer())
      .patch('/student-course/reset-student')
      .send({ studentId })
      .set({ Authorization: `Bearer ${token}` });
  }

  it('reset-student deve bloquear quem ja tem codigo de matricula', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    const [studentId] = await matricularEstudantes(
      representative.id,
      inscription.id,
      1,
    );

    // matriculado: ja era bloqueado antes
    await resetar(token, studentId).expect(400);

    // cancelada e encerrada passavam pelo guard antigo e produziam um
    // registro com codigo de matricula e status de candidato
    await studentCourseService.cancelEnrolled(studentId, 'Rotina');
    await resetar(token, studentId).expect(400);

    const cancelado = await studentCourseService.findOneBy({ id: studentId });
    cancelado.applicationStatus = StatusApplication.EnrollmentClosed;
    await studentCourseRepository.update(cancelado);
    await resetar(token, studentId).expect(400);

    const final = await studentCourseService.findOneBy({ id: studentId });
    expect(final.applicationStatus).toBe(StatusApplication.EnrollmentClosed);
    expect(final.cod_enrolled).toBeTruthy();
  }, 100000);

  it('reset-student deve continuar liberado para candidato sem codigo de matricula', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    const { id } = await createStudent(inscription.id);
    const student = await studentCourseService.findOneBy({ id });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);

    await resetar(token, id).expect(200);

    const resetado = await studentCourseService.findOneBy({ id });
    expect(resetado.applicationStatus).toBe(StatusApplication.UnderReview);
    expect(resetado.cod_enrolled).toBeFalsy();
  }, 100000);
  function ordenar(token: string, field: string, order = 'ASC') {
    return request(app.getHttpServer())
      .get(`/student-course/enrolled?sort[field]=${field}&sort[order]=${order}`)
      .set({ Authorization: `Bearer ${token}` });
  }

  it('sort[field] desconhecido deve responder 400, e nao 500', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    await matricularEstudantes(representative.id, inscription.id, 1);

    // antes: 500, porque o campo entrava cru no orderBy
    await ordenar(token, 'campo_inexistente').expect(400);
    await ordenar(token, 'actions').expect(400);
  }, 100000);

  it('todas as colunas ordenaveis do grid devem responder 200', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    await matricularEstudantes(representative.id, inscription.id, 2);

    // schoolYear, name, birthday e age davam 500 antes
    const campos = [
      'cod_enrolled',
      'class',
      'schoolYear',
      'inscriptionCourse',
      'email',
      'whatsapp',
      'cpf',
      'name',
      'applicationStatus',
      'birthday',
      'age',
    ];
    for (const campo of campos) {
      const res = await ordenar(token, campo);
      expect([campo, res.status]).toEqual([campo, 200]);
    }
  }, 100000);

  it('ordenar por turma deve usar o nome, e nao a chave estrangeira', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    // duas turmas com nomes em ordem inversa a de criacao, para que ordenar
    // pelo uuid da FK nao produza o mesmo resultado que ordenar pelo nome
    const turmaZ = await createClass(representative.id, 'Z-turma');
    const turmaA = await createClass(representative.id, 'A-turma');

    for (const turma of [turmaZ, turmaA]) {
      const { id } = await createStudent(inscription.id);
      const student = await studentCourseService.findOneBy({ id });
      student.applicationStatus = StatusApplication.DeclaredInterest;
      await studentCourseRepository.update(student);
      await studentCourseService.confirmEnrolled(student.id, turma.id);
    }

    const res = await ordenar(token, 'class', 'ASC').expect(200);
    const nomes = res.body.students.data.map(
      (e: { class: { name: string } }) => e.class.name,
    );
    expect(nomes).toEqual(['A-turma', 'Z-turma']);
  }, 100000);
  it('details deve exigir visualizarEstudantes', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const [studentId] = await matricularEstudantes(
      representative.id,
      inscription.id,
      1,
    );

    const papelSemNada = new CreateRoleDtoInput();
    papelSemNada.name = `details_sem_permissao_${Date.now()}`;
    representative.role = await roleService.create(papelSemNada);
    await userRepository.update(representative);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    // antes: o endpoint tinha so JwtAuthGuard e qualquer autenticado passava
    await request(app.getHttpServer())
      .get(`/student-course/${studentId}/details`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  }, 100000);

  it('details de estudante de outro cursinho deve responder 404', async () => {
    const cursinhoA = await createPartnerPrepCourse();
    const cursinhoB = await createPartnerPrepCourse();
    const [studentB] = await matricularEstudantes(
      cursinhoB.representative.id,
      cursinhoB.inscription.id,
      1,
    );

    const tokenA = await jwtService.signAsync({
      user: { id: cursinhoA.representative.id },
    });

    await request(app.getHttpServer())
      .get(`/student-course/${studentB}/details`)
      .set({ Authorization: `Bearer ${tokenA}` })
      .expect(404);
  }, 100000);

  it('details deve mascarar contatos e documentos conforme o papel', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const [studentId] = await matricularEstudantes(
      representative.id,
      inscription.id,
      1,
    );

    // papel admin do fixture ve tudo em claro
    const tokenAdmin = await jwtService.signAsync({
      user: { id: representative.id },
    });
    const claro = await request(app.getHttpServer())
      .get(`/student-course/${studentId}/details`)
      .set({ Authorization: `Bearer ${tokenAdmin}` })
      .expect(200);
    expect(claro.body.email).not.toContain('*');
    expect(claro.body.cpf).not.toContain('*');

    const papelRestrito = new CreateRoleDtoInput();
    papelRestrito.name = `details_visualizar_${Date.now()}`;
    papelRestrito.visualizarEstudantes = true;
    representative.role = await roleService.create(papelRestrito);
    await userRepository.update(representative);

    const tokenRestrito = await jwtService.signAsync({
      user: { id: representative.id },
    });
    const mascarado = await request(app.getHttpServer())
      .get(`/student-course/${studentId}/details`)
      .set({ Authorization: `Bearer ${tokenRestrito}` })
      .expect(200);

    expect(mascarado.body.email).toContain('*');
    expect(mascarado.body.cpf).toContain('*');
    expect(mascarado.body.telefone).toContain('*');
  }, 100000);
  it('export sem columns deve manter as 11 colunas fixas de antes', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    await matricularEstudantes(representative.id, inscription.id, 1);

    const { header } = await baixarExportacao(token);
    // values do exceljs e 1-indexed.
    // Mesmas 11 colunas de antes, mas agora na ordem dos grupos do catalogo
    // (Identificacao, Contato, Documentos, Matricula) e nao na ordem antiga.
    expect(header.slice(1)).toEqual([
      'Nº de matrícula',
      'Nome',
      'Nascimento',
      'Idade',
      'Email (conta)',
      'WhatsApp',
      'CPF',
      'Ano Letivo',
      'Processo Seletivo',
      'Turma',
      'Status',
    ]);
  }, 100000);

  it('export deve trazer so as colunas pedidas, na ordem do catalogo', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    await matricularEstudantes(representative.id, inscription.id, 1);

    // pedidas fora de ordem de proposito: a planilha deve sair na ordem do
    // catalogo, senao cada download teria um layout diferente
    const { header } = await baixarExportacao(
      token,
      '?columns=cpf,name,cod_enrolled',
    );
    expect(header.slice(1)).toEqual(['Nº de matrícula', 'Nome', 'CPF']);
  }, 100000);

  it('export com coluna desconhecida deve responder 400', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    await matricularEstudantes(representative.id, inscription.id, 1);

    await request(app.getHttpServer())
      .get('/student-course/enrolled/export?columns=name,password')
      .set({ Authorization: `Bearer ${token}` })
      .expect(400);
  }, 100000);

  it('export deve recusar coluna acima do papel, mesmo fora da UI', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    await matricularEstudantes(representative.id, inscription.id, 1);

    const papelRestrito = new CreateRoleDtoInput();
    papelRestrito.name = `export_colunas_${Date.now()}`;
    papelRestrito.visualizarEstudantes = true;
    representative.role = await roleService.create(papelRestrito);
    await userRepository.update(representative);

    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });

    // endereco exige gerenciarEstudantes para ser oferecido
    await request(app.getHttpServer())
      .get('/student-course/enrolled/export?columns=name,street')
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);

    // e o catalogo nem oferece a coluna
    const catalogo = await request(app.getHttpServer())
      .get('/student-course/enrolled/export/columns')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);
    const chaves = catalogo.body.map((c: { key: string }) => c.key);
    expect(chaves).not.toContain('street');
    expect(chaves).toContain('cpf');
    // cpf e oferecido, mas marcado como mascarado
    const cpf = catalogo.body.find((c: { key: string }) => c.key === 'cpf');
    expect(cpf.masked).toBe(true);
  }, 100000);

  it('export deve trazer a justificativa do cancelamento mais recente', async () => {
    const { representative, inscription } = await createPartnerPrepCourse();
    const token = await jwtService.signAsync({
      user: { id: representative.id },
    });
    const [studentId] = await matricularEstudantes(
      representative.id,
      inscription.id,
      1,
    );

    await studentCourseService.cancelEnrolled(studentId, 'Rotina');
    await dataSource.query(
      'UPDATE log_student SET created_at = DATE_SUB(created_at, INTERVAL 1 HOUR) WHERE student_id = ? AND applicationStatus = ?',
      [studentId, StatusApplication.EnrollmentCancelled],
    );
    await studentCourseService.activeEnrolled(studentId);
    await studentCourseService.cancelEnrolled(studentId, 'Transporte');

    const { header, rows } = await baixarExportacao(
      token,
      '?columns=cod_enrolled,cancelJustification',
    );
    expect(header.slice(1)).toEqual([
      'Nº de matrícula',
      'Justificativa do cancelamento',
    ]);
    expect(rows[0][2]).toBe('Transporte');
  }, 100000);
});
