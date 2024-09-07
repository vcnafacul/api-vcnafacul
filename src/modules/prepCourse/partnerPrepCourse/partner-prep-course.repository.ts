import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { PartnerPrepCourse } from './partner-prep-course.entity';

@Injectable()
export class PartnerPrepCourseRepository extends BaseRepository<PartnerPrepCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PartnerPrepCourse));
  }
}
