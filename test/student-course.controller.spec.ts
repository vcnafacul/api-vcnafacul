import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StudentCourseController } from 'src/modules/prepCourse/studentCourse/student-course.controller';
import { StudentCourse } from 'src/modules/prepCourse/studentCourse/student-course.entity';
import { StudentCourseService } from 'src/modules/prepCourse/studentCourse/student-course.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import * as request from 'supertest';
import { createStudentCourseDTOInputFaker } from 'test/faker/create-student-course.dto.input.faker';

describe('StudentCourseController', () => {
  let app: INestApplication;
  let service: StudentCourseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StudentCourseController],
      providers: [
        {
          provide: StudentCourseService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard) // Aqui estamos substituindo o guard por um mock
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    service = moduleFixture.get<StudentCourseService>(StudentCourseService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new StudentCourse', () => {
    const dto = createStudentCourseDTOInputFaker();
    const result = new StudentCourse();
    result.cpf = dto.cpf;
    result.rg = dto.rg;
    result.uf = dto.uf;
    result.userId = dto.userId;

    jest.spyOn(service, 'create').mockResolvedValue(result);

    return request(app.getHttpServer())
      .post('/student-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual(result);
      });
  });
});
