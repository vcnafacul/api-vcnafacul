import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoRepository } from 'src/modules/geo/geo.repository';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import createFakeDocxBase64 from './utils/createFakeDocxBase64';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');
jest.mock('src/shared/services/blob/blob-service.ts');

describe('PartnerPrepCourse (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let inscriptionCourseService: InscriptionCourseService;
  let blobService: BlobService;
  let formService: FormService;
  let submissionService: SubmissionService;
  let logPartnerRepository: LogPartnerRepository;
  let logGeoRepository: LogGeoRepository;
  let geoRepository: GeoRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
      .overrideGuard(JwtAuthGuard) // Aqui estamos substituindo o guard por um mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    emailService = moduleFixture.get<EmailService>(EmailService);
    roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
    roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
      RoleUpdateAdminSeedService,
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    partnerPrepCourseService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    blobService = moduleFixture.get<BlobService>('BlobService');
    formService = moduleFixture.get<FormService>(FormService);
    submissionService = moduleFixture.get<SubmissionService>(SubmissionService);

    logPartnerRepository =
      moduleFixture.get<LogPartnerRepository>(LogPartnerRepository);
    logGeoRepository = moduleFixture.get<LogGeoRepository>(LogGeoRepository);
    geoRepository = moduleFixture.get<GeoRepository>(GeoRepository);

    // Mock do geoService.create para evitar operações de email e log
    jest.spyOn(geoService, 'create').mockImplementation(async (dto) => {
      return await geoRepository.create(geoService['convertDtoToDomain'](dto));
    });

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
      .spyOn(emailService, 'sendInviteMember')
      .mockImplementation(async () => {});

    jest.spyOn(emailService, 'sendEmailGeo').mockImplementation(async () => {});

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
      .spyOn(formService, 'createFormFull')
      .mockImplementation(async () => 'hashKeyFile');

    jest
      .spyOn(formService, 'hasActiveForm')
      .mockImplementation(async () => true);

    jest
      .spyOn(submissionService, 'createSubmission')
      .mockImplementation(async () => 'hashKeyFile');

    await app.init();
    await roleSeedService.seed();
    await roleUpdateAdminSeedService.seed();
  });

  afterAll(async () => {
    await app.close();
  }, 30000);

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

  it('should create a new PartnerPrepCourse', async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    let role: Role = null;
    role = await roleService.findOneBy({ name: 'custom_role' });
    if (!role) {
      const newRole = new CreateRoleDtoInput();
      newRole.name = 'custom_role';
      newRole.alterarPermissao = true;
      role = await roleService.create(newRole);
    }

    user.role = role;
    await userRepository.update(user);

    const dto: PartnerPrepCourseDtoInput = {
      geoId: geo.id,
      representative: user.id,
    };

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return await request(app.getHttpServer())
      .post('/partner-prep-course')
      .set({
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      })
      .send(dto)
      .expect(201);
  }, 30000);

  it('should not create a new PartnerPrepCourse because already exists', async () => {
    const { representative, partnerPrepCourse } =
      await createPartnerPrepCourse();

    const dto: PartnerPrepCourseDtoInput = {
      geoId: partnerPrepCourse.geo.id,
      representative: representative.id,
    };

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    return await request(app.getHttpServer())
      .post('/partner-prep-course')
      .set({
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      })
      .send(dto)
      .expect(409)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Cursinho parceiro já existe');
      });
  }, 30000);

  it('should not create a new PartnerPrepCourse without representative', async () => {
    const { representative, partnerPrepCourse } =
      await createPartnerPrepCourse();

    const dto: PartnerPrepCourseDtoInput = {
      geoId: partnerPrepCourse.geo.id,
      representative: 'hash-not-exist',
    };

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    return await request(app.getHttpServer())
      .post('/partner-prep-course')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message[0]).toBe('Usuário não encontrado');
      });
  }, 30000);

  it('invite member, partner prep course not found', async () => {
    const representative = await createUserRepresentative();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      email: 'not-exist',
    };

    return await request(app.getHttpServer())
      .post('/partner-prep-course/invite-members')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Cursinho parceiro não encontrado');
      });
  });

  it('invite member, user not found', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      email: 'not-exist',
    };

    return await request(app.getHttpServer())
      .post('/partner-prep-course/invite-members')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('Usuário não encontrado');
      });
  });

  it('invite member, user is already member', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const dto = {
      email: representative.email,
    };

    return await request(app.getHttpServer())
      .post('/partner-prep-course/invite-members')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe(
          'Usuário já é membro desse cursinho parceiro',
        );
      });
  });

  it('invite member, user is already member', async () => {
    const { representative } = await createPartnerPrepCourse();

    const token = await jwtService.signAsync(
      { user: { id: representative.id } },
      { expiresIn: '2h' },
    );

    const user = await createUserRepresentative();

    const dto = {
      email: user.email,
    };

    return await request(app.getHttpServer())
      .post('/partner-prep-course/invite-members')
      .send(dto)
      .set({
        Authorization: `Bearer ${token}`,
      })
      .expect(201);
  });
});
