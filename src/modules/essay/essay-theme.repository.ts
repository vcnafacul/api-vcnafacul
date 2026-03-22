import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { EssayTheme } from './entities/essay-theme.entity';

@Injectable()
export class EssayThemeRepository extends BaseRepository<EssayTheme> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(EssayTheme));
  }

  async findCurrentTheme(): Promise<EssayTheme | null> {
    return this.repository
      .createQueryBuilder('theme')
      .where('theme.deletedAt IS NULL')
      .andWhere('theme.active = :active', { active: true })
      .andWhere('theme.week_start <= CURDATE()')
      .andWhere('theme.week_end >= CURDATE()')
      .orderBy('theme.week_start', 'DESC')
      .getOne();
  }
}
