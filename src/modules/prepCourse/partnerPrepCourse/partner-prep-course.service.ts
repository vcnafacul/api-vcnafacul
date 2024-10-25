import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Permissions } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { BaseService } from 'src/shared/modules/base/base.service';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { HasInscriptionActiveDtoOutput } from './dtos/has-inscription-active.output.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';

@Injectable()
export class PartnerPrepCourseService extends BaseService<PartnerPrepCourse> {
  constructor(
    private readonly repository: PartnerPrepCourseRepository,
    private readonly roleService: RoleService,
    private readonly userRoleRepository: UserRoleRepository,
  ) {
    super(repository);
  }

  async create(dto: PartnerPrepCourseDtoInput): Promise<PartnerPrepCourse> {
    const partnerPrepCourse = new PartnerPrepCourse();
    partnerPrepCourse.geoId = dto.geoId;
    partnerPrepCourse.userId = dto.userId;

    const role = await this.roleService.findOneBy({
      name: Permissions.gerenciarInscricoesCursinhoParceiro,
    });

    const userRole = await this.userRoleRepository.findOneBy({
      userId: dto.userId,
    });

    userRole.roleId = role.id;
    await this.userRoleRepository.update(userRole);
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
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const activedInscription = prep.inscriptionCourses.find((i) => i.actived);
    if (!activedInscription) {
      throw new HttpException(
        'Não há inscrições ativas para esse cursinho no momento',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      prepCourseName: prep.geo.name,
      hasActiveInscription: true,
    };
  }
}
