import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { createStudentCourseDTOInputFaker } from './faker/create-student-course.dto.input.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

describe('StudentCourse-JWT (e2e)', () => {
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
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    }).compile();

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
    jwtService = moduleFixture.get<JwtService>(JwtService);

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

  it('has student enrolled without inscription?', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourse = await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        userId: representative.id,
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
      .get('/student-course/get-user-info/' + partnerPrepCourse.id)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(
          'Não existe inscrição ativa para este curso',
        );
      });
  }, 30000);

  it('should return user info', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourse = await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        userId: representative.id,
      },
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

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return request(app.getHttpServer())
      .get('/student-course/get-user-info/' + partnerPrepCourse.id)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toEqual(user.email);
      });
  }, 30000);

  it('should return user info', async () => {
    const geo = await geoService.create(CreateGeoDTOInputFaker());
    const representativeDTO = CreateUserDtoInputFaker();
    await userService.create(representativeDTO);
    const representative = await userRepository.findOneBy({
      email: representativeDTO.email,
    });

    const partnerPrepCourse = await partnerPrepCourseService.create(
      {
        geoId: geo.id,
        userId: representative.id,
      },
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

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const dto = createStudentCourseDTOInputFaker(user.id, partnerPrepCourse.id);

    await studentCourseService.create(dto);

    return request(app.getHttpServer())
      .get('/student-course/get-user-info/' + partnerPrepCourse.id)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(
          'Você já realizou a inscrição neste Processo Seletivo.',
        );
      });
  }, 30000);
});
