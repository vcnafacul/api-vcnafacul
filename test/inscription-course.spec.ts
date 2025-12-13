import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { RoleSeedService } from 'src/db/seeds/1-role.seed';
import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
import { GeoService } from 'src/modules/geo/geo.service';
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { RoleService } from 'src/modules/role/role.service';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { User } from 'src/modules/user/user.entity';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { CreateGeoDTOInputFaker } from './faker/create-geo.dto.input.faker';
import { CreateInscriptionCourseDTOInputFaker } from './faker/create-inscription-course.dto.faker';
import { CreateUserDtoInputFaker } from './faker/create-user.dto.input.faker';
import createFakeDocxBase64 from './utils/createFakeDocxBase64';
import { createNestAppTest } from './utils/createNestAppTest';

// Mock the EmailService globally
jest.mock('src/shared/services/email/email.service');

jest.mock('src/shared/services/blob/blob-service.ts');

describe('InscriptionCourse', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let emailService: EmailService;
  let roleSeedService: RoleSeedService;
  let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
  let partnerPrepCourseService: PartnerPrepCourseService;
  let geoService: GeoService;
  let roleService: RoleService;
  let userRepresentative: User;
  let inscriptionService: InscriptionCourseService;
  let inscriptionRepository: InscriptionCourseRepository;
  let blobService: BlobService;
  let formService: FormService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [EmailService, ConfigService],
    })
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
    roleService = moduleFixture.get<RoleService>(RoleService);
    inscriptionService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    inscriptionRepository = moduleFixture.get<InscriptionCourseRepository>(
      InscriptionCourseRepository,
    );
    blobService = moduleFixture.get<BlobService>('BlobService');
    formService = moduleFixture.get<FormService>(FormService);

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
      .spyOn(formService, 'createFormFull')
      .mockImplementation(async () => 'hashKeyFile');

    jest
      .spyOn(formService, 'hasActiveForm')
      .mockImplementation(async () => true);

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
    userRepresentative = await userRepository.findOneBy({
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

  it('should update status inscription', async () => {
    const { representative } = await createPartnerPrepCourse();

    const inscriptionDto = CreateInscriptionCourseDTOInputFaker();
    inscriptionDto.startDate.setDate(inscriptionDto.startDate.getDate() + 2);
    const inscriptionCreated = await inscriptionService.create(
      inscriptionDto,
      representative.id,
    );
    const inscription = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });
    expect(inscription.actived).toBe(Status.Pending);

    inscription.startDate.setDate(inscription.startDate.getDate() - 3);
    await inscriptionRepository.update(inscription);

    await inscriptionService.updateInfosInscription();

    const updated = await inscriptionService.findOneBy({
      id: inscriptionCreated.id,
    });

    expect(updated.actived).toBe(Status.Approved);
  });
});
