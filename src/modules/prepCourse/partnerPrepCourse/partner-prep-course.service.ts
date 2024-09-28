import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { HasInscriptionActiveDtoOutput } from './dtos/has-inscription-active.output.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';

@Injectable()
export class PartnerPrepCourseService extends BaseService<PartnerPrepCourse> {
  constructor(private readonly repository: PartnerPrepCourseRepository) {
    super(repository);
  }

  async create(dto: PartnerPrepCourseDtoInput): Promise<PartnerPrepCourse> {
    const partnerPrepCourse = new PartnerPrepCourse();
    partnerPrepCourse.geoId = dto.geoId;
    partnerPrepCourse.userId = dto.userId;
    return await this.repository.create(partnerPrepCourse);
  }

  async update(entity: PartnerPrepCourse): Promise<void> {
    await this.repository.update(entity);
  }

  async hasActiveInscription(
    id: string,
  ): Promise<HasInscriptionActiveDtoOutput> {
    const prep = await this.repository.findOneBy({ id });
    if (!prep) {
      return {
        prepCourseName: '',
        hasActiveInscription: false,
      };
    }
    return {
      prepCourseName: prep.geo.name,
      hasActiveInscription: prep.inscriptionCourses.some((i) => i.actived),
    };
  }
}
