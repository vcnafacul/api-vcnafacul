// partner-prep-course.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PartnerPrepCourseDtoInput } from 'src/modules/prepCourse/partnerPrepCourse/dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourse } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseRepository } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.repository';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';

describe('PartnerPrepCourseService', () => {
  let service: PartnerPrepCourseService;
  let repository: PartnerPrepCourseRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerPrepCourseService,
        {
          provide: PartnerPrepCourseRepository,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PartnerPrepCourseService>(PartnerPrepCourseService);
    repository = module.get<PartnerPrepCourseRepository>(
      PartnerPrepCourseRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new PartnerPrepCourse', async () => {
    const dto: PartnerPrepCourseDtoInput = { geoId: 1, userId: 2 };
    const result = new PartnerPrepCourse();
    result.geoId = dto.geoId;
    result.userId = dto.userId;

    jest.spyOn(repository, 'create').mockResolvedValue(result);

    expect(await service.createPartnerPrepCourse(dto)).toEqual(result);
    expect(repository.create).toHaveBeenCalledWith(result);
  });
});
