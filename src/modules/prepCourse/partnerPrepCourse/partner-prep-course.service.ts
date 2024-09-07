import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';

@Injectable()
export class PartnerPrepCourseService extends BaseService<PartnerPrepCourse> {
  constructor(private readonly repository: PartnerPrepCourseRepository) {
    super(repository);
  }

  async createPartnerPrepCourse(
    dto: PartnerPrepCourseDtoInput,
  ): Promise<PartnerPrepCourse> {
    const partnerPrepCourse = new PartnerPrepCourse();
    partnerPrepCourse.geoId = dto.geoId;
    partnerPrepCourse.userId = dto.userId;
    return await this.repository.create(partnerPrepCourse);
  }
}
