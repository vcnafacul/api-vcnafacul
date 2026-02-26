import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from 'src/app.module';
import { GeoService } from 'src/modules/geo/geo.service';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { ClassDtoOutput } from 'src/modules/prepCourse/class/dtos/class.dto.output';
import { CoursePeriodService } from 'src/modules/prepCourse/coursePeriod/course-period.service';
import { InscriptionCourseService } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.service';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { LogPartnerRepository } from 'src/modules/prepCourse/partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { FormService } from 'src/modules/vcnafacul-form/form/form.service';
import { SubmissionService } from 'src/modules/vcnafacul-form/submission/submission.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import * as request from 'supertest';
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

describe('Class (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;
  let userRepository: UserRepository;
  let geoService: GeoService;
  let jwtService: JwtService;
  let roleService: RoleService;
  let partnerService: PartnerPrepCourseService;
  let emailService: EmailService;
  let classRepository: ClassRepository;
  let inscriptionCourseService: InscriptionCourseService;
  let studentCourseService: StudentCourseService;
  let coursePeriodService: CoursePeriodService;
  let role: Role = null;
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
      providers: [EmailService],
    })
      .overrideProvider(FormService)
      .useValue(formServiceMock)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = createNestAppTest(moduleFixture);
    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    geoService = moduleFixture.get<GeoService>(GeoService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    emailService = moduleFixture.get<EmailService>(EmailService);
    partnerService = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    classRepository = moduleFixture.get<ClassRepository>(ClassRepository);
    inscriptionCourseService = moduleFixture.get<InscriptionCourseService>(
      InscriptionCourseService,
    );
    studentCourseService =
      moduleFixture.get<StudentCourseService>(StudentCourseService);
    coursePeriodService =
      moduleFixture.get<CoursePeriodService>(CoursePeriodService);

    submissionService = moduleFixture.get<SubmissionService>(SubmissionService);
    jest.spyOn(emailService, 'sendEmailGeo').mockImplementation(async () => {});
    blobService = moduleFixture.get<BlobService>('BlobService');
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

    role = await roleService.findOneBy({ name: 'custom_role_class' });
    if (!role) {
      const newRole = new CreateRoleDtoInput();
      newRole.name = 'custom_role_class';
      newRole.gerenciarTurmas = true;
      role = await roleService.create(newRole);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const createPartnerFaker = async () => {
    const geoDto = CreateGeoDTOInputFaker();
    const geo = await geoService.create(geoDto);

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    user.role = role;
    await userRepository.update(user);

    const dto: PartnerPrepCourseDtoInput = {
      geoId: geo.id,
      representative: user.id,
    };
    const partner = await partnerService.create(dto, user.id);
    return { user, partner };
  };

  const createClassWithPeriod = async (userId: string, className?: string) => {
    // Criar um período letivo
    const coursePeriodDto = CreateCoursePeriodDtoInputFaker();
    const coursePeriod = await coursePeriodService.create(
      coursePeriodDto,
      userId,
    );

    // Criar a turma com o período letivo
    const classDto = {
      name: className || 'test',
      description: 'test',
      coursePeriodId: coursePeriod.id,
    };

    return classDto;
  };

  it('should be create a class', async () => {
    const { user } = await createPartnerFaker();
    const classDto = await createClassWithPeriod(user.id);

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    return await request(app.getHttpServer())
      .post('/class')
      .expect(201)
      .send(classDto)
      .set({
        Authorization: `Bearer ${token}`,
      });
  }, 30000);

  it('should update a class successfully', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Criando uma turma para testar a atualização
    const classDto = await createClassWithPeriod(user.id, 'Initial Name');
    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .send(classDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(201);

    const updateDto = {
      id: createdClass.body.id,
      name: 'Updated Name',
      description: 'Updated Description',
    };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    const updatedClass = await request(app.getHttpServer())
      .get(`/class/${updateDto.id}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    expect(updatedClass.body.name).toBe(updateDto.name);
    expect(updatedClass.body.description).toBe(updateDto.description);
  });

  it('should return 404 if class does not exist', async () => {
    const { user } = await createPartnerFaker();
    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const updateDto = {
      id: 'non-existing-class-id',
      name: 'Updated Name',
    };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(404);
  });

  it('should return 403 if user lacks permissions', async () => {
    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const user = await userRepository.findOneBy({ email: userDto.email });

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    const updateDto = { _id: 'existing-class-id', name: 'New Name' };

    await request(app.getHttpServer())
      .patch('/class')
      .send(updateDto)
      .set({ Authorization: `Bearer ${token}` })
      .expect(403);
  });

  it('should delete a class successfully', async () => {
    const { user } = await createPartnerFaker();

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Criando a classe antes de testar a deleção
    const classDto = await createClassWithPeriod(user.id, 'test class');

    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .set({ Authorization: `Bearer ${token}` })
      .send(classDto)
      .expect(201);

    const classId = createdClass.body.id;

    // Testando a deleção da turma
    await request(app.getHttpServer())
      .delete(`/class/${classId}`)
      .set({ Authorization: `Bearer ${token}` })
      .expect(200);

    // Verificando se a turma foi realmente deletada (soft delete)
    const deletedClass = await classRepository.findOneBy({ id: classId });
    expect(deletedClass.deletedAt).not.toBeNull();
  }, 30000);

  it('should return 404 when trying to delete a non-existent class', async () => {
    const { user } = await createPartnerFaker();

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    await request(app.getHttpServer())
      .delete('/class/non-existent-id')
      .set({ Authorization: `Bearer ${token}` })
      .expect(404);
  }, 30000);

  it('should list class with number of students', async () => {
    const { user } = await createPartnerFaker();

    const token = await jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );

    // Criando a classe antes de testar a deleção
    const classDto = await createClassWithPeriod(user.id, 'test class');

    const createdClass = await request(app.getHttpServer())
      .post('/class')
      .set({ Authorization: `Bearer ${token}` })
      .send(classDto)
      .expect(201);

    const classId = createdClass.body.id;

    const inscriptionCourseDto = CreateInscriptionCourseDTOInputFaker();
    const inscription = await inscriptionCourseService.create(
      inscriptionCourseDto,
      user.id,
    );

    const userDto = CreateUserDtoInputFaker();
    await userService.create(userDto);
    const userStudent = await userRepository.findOneBy({
      email: userDto.email,
    });

    const dto = createStudentCourseDTOInputFaker(
      userStudent.id,
      inscription.id,
    );
    dto.rg = '45.678.123-4';

    const student = await studentCourseService.create(dto);

    await studentCourseService.updateClass(student.id, classId);

    return request(app.getHttpServer())
      .get('/class')
      .set({ Authorization: `Bearer ${token}` })
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeDefined();
        expect(res.body.data.length).toBe(1);
        const turma: ClassDtoOutput = res.body.data[0];
        expect(turma.id).toBe(classId);
        expect(turma.number_students).toBe(1);
      });
  }, 30000);
});
