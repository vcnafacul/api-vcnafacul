import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Permissions } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserRoleRepository } from 'src/modules/user-role/user-role.repository';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { HasInscriptionActiveDtoOutput } from './dtos/has-inscription-active.output.dto';
import { inviteMembersInputDto } from './dtos/invite-members.input.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';

@Injectable()
export class PartnerPrepCourseService extends BaseService<PartnerPrepCourse> {
  constructor(
    private readonly repository: PartnerPrepCourseRepository,
    private readonly roleService: RoleService,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
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

    userRole.role = role;
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

  async inviteMember({ userId, email }: inviteMembersInputDto) {
    const prepCourse = await this.repository.findOneBy({ userId });
    if (!prepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const user = await this.userService.findOneBy({ email });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    if (prepCourse.members) {
      const users = prepCourse.members.find((m) => m.email === user.email);
      if (users) {
        throw new HttpException(
          'Usuário já é membro desse cursinho parceiro',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const token = await this.jwtService.signAsync(
      {
        user: { id: user.id, partnerPrepCourse: { id: prepCourse.id } },
      },
      { expiresIn: '7d' },
    );
    const fullName = prepCourse.user.firstName + ' ' + prepCourse.user.lastName;
    await this.emailService.sendInviteMember(
      user.email,
      user.firstName,
      fullName,
      prepCourse.geo.name,
      token,
    );
  }

  async inviteMemberAccept(prepCourse: string, userId: string) {
    const prepCoursePartner = await this.repository.findOneBy({
      id: prepCourse,
    });
    if (!prepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const user = await this.userService.findOneBy({ id: userId });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    if (
      prepCoursePartner.members &&
      prepCoursePartner.members.find((m) => m.id === user.id)
    ) {
      return;
    }
    if (!prepCoursePartner.members) {
      prepCoursePartner.members = [user];
    } else {
      if (!prepCoursePartner.members.find((m) => m.id === user.id)) {
        prepCoursePartner.members.push(user);
      }
    }

    const role = await this.roleService.findOneBy({
      name: Permissions.gerenciarInscricoesCursinhoParceiro,
    });

    const userRole = await this.userRoleRepository.findOneBy({
      userId: userId,
    });

    userRole.role = role;
    user.partnerPrepCourse = prepCoursePartner;
    await this.userRoleRepository.update(userRole);
    await this.userService.updateEntity(user);
    await this.repository.update(prepCoursePartner);
  }

  async getByUserId(userId: string): Promise<PartnerPrepCourse> {
    let parnetPrepCourse = null;
    parnetPrepCourse = await this.repository.findOneBy({ userId });
    if (!parnetPrepCourse) {
      parnetPrepCourse = await this.userService.getPartnerPrepCourse(userId);
    }
    if (!parnetPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    return parnetPrepCourse;
  }
}
