import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { ClassService } from 'src/modules/prepCourse/class/class.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
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
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import * as request from 'supertest';
import CreateClassDtoInputFaker from './faker/create-class.dto.input.faker';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
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
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let inscriptionCourseService: InscriptionCourseService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let blobService: BlobService;
  let logStudentRepository: LogStudentRepository;
  let classService: ClassService;

  const discordWebhookMock = {
    sendMessage: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideProvider(DiscordWebhook)
      .useValue(discordWebhookMock)
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
      .mockImplementation(async () =>
        Buffer.from('conteúdo fake de um arquivo'),
      );

    jest
      .spyOn(studentCourseService['discordWebhook'], 'sendMessage')
      .mockImplementation(async () => {});

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
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
    partnerPrepCourse.geo = geo;

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
    const classDto = CreateClassDtoInputFaker(className);
    return await classService.create(classDto, userId);
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
    const { inscription, token } = await createPartnerPrepCourse();

    const { id } = await createStudent(inscription.id);

    const student = await studentCourseService.findOneBy({ id });
    student.applicationStatus = StatusApplication.DeclaredInterest;
    await studentCourseRepository.update(student);

    await request(app.getHttpServer())
      .patch(`/student-course/confirm-enrolled/${id}`)
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
      await studentCourseService.confirmEnrolled(student.id);
    }

    // 4. Faz chamada à rota sem filtro nem ordenação
    const response = await request(app.getHttpServer())
      .get('/student-course/enrolled')
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
      await studentCourseService.confirmEnrolled(student.id);

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
      await studentCourseService.confirmEnrolled(student2.id);

      const user2 = await userService.findOneBy({ id: student2.userId });
      user2.birthday = new Date('2000-01-01');
      await userRepository.update(user2);

      const token = await jwtService.signAsync({
        user: { id: representative.id },
        expiresIn: '2h',
      });

      let url = `/student-course/enrolled?filter[field]=${field}&filter[value]=${value}`;
      if (operator) {
        url += `&filter[operator]=${operator}`;
      }
      if (order) {
        url += `&sort[${sort}]=${order}`;
      }

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
});
