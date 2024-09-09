// partner-prep-course.controller.spec.ts

import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourseController } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.controller';
import { PartnerPrepCourse } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import * as request from 'supertest';

describe('PartnerPrepCourseController', () => {
  let app: INestApplication;
  let service: PartnerPrepCourseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PartnerPrepCourseController],
      providers: [
        {
          provide: PartnerPrepCourseService,
          useValue: {
            createPartnerPrepCourse: jest.fn(),
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
    service = moduleFixture.get<PartnerPrepCourseService>(
      PartnerPrepCourseService,
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new PartnerPrepCourse', () => {
    const dto: PartnerPrepCourseDtoInput = { geoId: 1, userId: 2 };
    const result = new PartnerPrepCourse();
    result.geoId = dto.geoId;
    result.userId = dto.userId;

    jest.spyOn(service, 'createPartnerPrepCourse').mockResolvedValue(result);

    return request(app.getHttpServer())
      .post('/partner-prep-course')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual(result);
      });
  });

  it('should return 404 if geoId does not exist', async () => {
    const dto: PartnerPrepCourseDtoInput = { geoId: 999, userId: 1 }; // geoId inexistente
    jest
      .spyOn(service, 'createPartnerPrepCourse')
      .mockImplementation(async () => {
        throw new NotFoundException(`GeoId ${dto.geoId} not found`);
      });

    return request(app.getHttpServer())
      .post('/partner-prep-course')
      .send(dto)
      .expect(404)
      .expect({
        statusCode: 404,
        message: `GeoId ${dto.geoId} not found`,
        error: 'Not Found',
      });
  });

  it('should return 404 if userId does not exist', async () => {
    const dto: PartnerPrepCourseDtoInput = { geoId: 1, userId: 999 }; // userId inexistente
    jest
      .spyOn(service, 'createPartnerPrepCourse')
      .mockImplementation(async () => {
        throw new NotFoundException(`UserId ${dto.userId} not found`);
      });

    return request(app.getHttpServer())
      .post('/partner-prep-course')
      .send(dto)
      .expect(404)
      .expect({
        statusCode: 404,
        message: `UserId ${dto.userId} not found`,
        error: 'Not Found',
      });
  });
});
