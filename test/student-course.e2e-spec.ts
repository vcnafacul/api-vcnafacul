import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { GetAllStudentDtoInput } from 'src/modules/prepCourse/studentCourse/dtos/get-all-student.dto.input';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('StudentCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let studentCourseService: StudentCourseService;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let inscriptionCourseService: InscriptionCourseService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(JwtAuthGuard) // Here we are replacing the guard with a mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(PermissionsGuard) // Here we are replacing the guard with a mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
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
    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    geoService = moduleFixture.get<GeoService>(GeoService);
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );

    jest
      .spyOn(emailService, 'sendCreateUser')
      .mockImplementation(async () => {});

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new StudentCourse', async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourseDto = {
      geoId: geo.id,
      userId: representative.id,
    };

    const partnerPrepCourse = await partnerPrepCourseService.create(
      partnerPrepCourseDto,
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, partnerPrepCourse.id);
    dto.rg = '45.678.123-4';

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('user not exist', async () => {
    const dto = createStudentCourseDTOInputFaker();

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
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

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
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

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('get all student course by partner course', async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourseDto = {
      geoId: geo.id,
      userId: representative.id,
    };

    const partnerPrepCourse = await partnerPrepCourseService.create(
      partnerPrepCourseDto,
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    for (let index = 0; index < 10; index++) {
      const userDto = CreateUserDtoInputFaker();
      await userService.create(userDto);
      const user = await userRepository.findOneBy({ email: userDto.email });

      const student = createStudentCourseDTOInputFaker(
        user.id,
        partnerPrepCourse.id,
      );
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
      .expect(200)
      .expect((res) => {
        expect(res.body.data.length).toBe(10);
      });
  }, 60000);

  it('student should enroll in two different prep courses', async () => {
    const geoDto1 = CreateGeoDTOInputFaker();
    const geo1 = await geoService.create(geoDto1);
    const geoDto2 = CreateGeoDTOInputFaker();
    const geo2 = await geoService.create(geoDto2);

    const representativeDTO1 = CreateUserDtoInputFaker();
    await userService.create(representativeDTO1);
    const representative1 = await userRepository.findOneBy({
      email: representativeDTO1.email,
    });

    const representativeDTO2 = CreateUserDtoInputFaker();
    await userService.create(representativeDTO2);
    const representative2 = await userRepository.findOneBy({
      email: representativeDTO2.email,
    });

    const partnerPrepCourseDto1 = {
      geoId: geo1.id,
      userId: representative1.id,
    };

    const partnerPrepCourseDto2 = {
      geoId: geo2.id,
      userId: representative2.id,
    };

    const partnerPrepCourse1 = await partnerPrepCourseService.create(
      partnerPrepCourseDto1,
      representative1.id,
    );

    const inscriptionCourseDto1 = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto1,
      representative1.id,
    );

    const partnerPrepCourse2 = await partnerPrepCourseService.create(
      partnerPrepCourseDto2,
      representative1.id,
    );

    const inscriptionCourseDto2 = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto2,
      representative2.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const student = createStudentCourseDTOInputFaker(
      user.id,
      partnerPrepCourse1.id,
    );
    student.rg = '45.678.123-4';

    await request(app.getHttpServer())
      .post('/student-course')
      .send(student)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });

    student.partnerPrepCourse = partnerPrepCourse2.id;

    return request(app.getHttpServer())
      .post('/student-course')
      .send(student)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      })
      .expect(201);
  }, 30000);

  it('should create a new StudentCourse with legal guardian for minors', async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourseDto = {
      geoId: geo.id,
      userId: representative.id,
    };

    const partnerPrepCourse = await partnerPrepCourseService.create(
      partnerPrepCourseDto,
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, partnerPrepCourse.id);

    const today = new Date();
    const birthDate = new Date(today.setFullYear(today.getFullYear() - 17));
    dto.birthday = birthDate;

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).not.toBeNull();
      });
  }, 30000);

  it('should return 400 if a minor does not have a legal guardian', async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourseDto = {
      geoId: geo.id,
      userId: representative.id,
    };

    const partnerPrepCourse = await partnerPrepCourseService.create(
      partnerPrepCourseDto,
      representative.id,
    );

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    await inscriptionCourseService.create(
      inscriptionCourseDto,
      representative.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const dto = createStudentCourseDTOInputFaker(user.id, partnerPrepCourse.id);
    const today = new Date();
    const birthDate = new Date(today.setFullYear(today.getFullYear() - 17));
    dto.birthday = birthDate;
    dto.legalGuardian = null;

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(
          'The full Legal guardian information is required for minors',
        );
      });
  }, 30000);
});
