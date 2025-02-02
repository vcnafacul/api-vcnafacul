import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DataSource } from 'typeorm';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { HasInscriptionActiveDtoOutput } from './dtos/has-inscription-active.output.dto';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';

@Injectable()
export class PartnerPrepCourseService extends BaseService<PartnerPrepCourse> {
  constructor(
    private readonly repository: PartnerPrepCourseRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly collaboratorRepository: CollaboratorRepository,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    super(repository);
  }

  async create(dto: PartnerPrepCourseDtoInput): Promise<PartnerPrepCourse> {
    let partnerPrepCourse = null;
    await this.dataSource.transaction(async (manager) => {
      const existingCourse = await manager
        .getRepository(PartnerPrepCourse)
        .findOneBy({ geoId: dto.geoId });
      if (existingCourse) {
        throw new HttpException(
          'Cursinho parceiro já existe',
          HttpStatus.CONFLICT,
        );
      }

      const user = await this.userService.findOneBy({ id: dto.userId });
      if (!user) {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }

      partnerPrepCourse = new PartnerPrepCourse();
      partnerPrepCourse.geoId = dto.geoId;

      let collaborator = await manager
        .getRepository(Collaborator)
        .findOneBy({ user: { id: user.id } });

      if (!collaborator) {
        collaborator = new Collaborator();
        collaborator.user = user;
        collaborator.description = 'Representante Cursinho';
      }

      collaborator.partnerPrepCourse = partnerPrepCourse;

      partnerPrepCourse.members = [collaborator];

      // Salvar cursinho e colaborador na mesma transação
      await manager.getRepository(PartnerPrepCourse).save(partnerPrepCourse);
      await manager.getRepository(Collaborator).save(collaborator);
    });
    if (partnerPrepCourse) {
      return partnerPrepCourse;
    }
    throw new HttpException(
      'Erro ao criar cursinho parceiro',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
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
    const activedInscription = prep.inscriptionCourses.find(
      (i) => i.actived === Status.Approved && i.endDate > new Date(),
    );
    if (!activedInscription) {
      throw new HttpException(
        'Não há inscrições ativas para esse cursinho no momento',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      prepCourseName: prep.geo.name,
      hasActiveInscription: true,
      inscription: {
        name: activedInscription.name,
        description: activedInscription.description,
        startDate: activedInscription.startDate,
        endDate: activedInscription.endDate,
      },
    };
  }

  async inviteMember(email: string, userId: string) {
    const inviter = await this.userService.findOneBy({ id: userId });
    const prepCourse = await this.getByUserId(userId);
    if (!prepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const user = await this.userService.findOneBy({ email });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    const collaborator = await this.collaboratorRepository.findOneByUserId(
      user.id,
    );
    if (prepCourse.members && collaborator) {
      const collaborators = prepCourse.members.find(
        (m) => m.id === collaborator.id,
      );
      if (collaborators) {
        throw new HttpException(
          'Usuário já é membro desse cursinho parceiro',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const token = await this.jwtService.signAsync(
      {
        user: { id: user.id, partner: prepCourse.id },
      },
      { expiresIn: '7d' },
    );
    const fullName = inviter.firstName + ' ' + inviter.lastName;
    await this.emailService.sendInviteMember(
      user.email,
      user.firstName,
      fullName,
      prepCourse.geo.name,
      token,
    );
  }

  async inviteMemberAccept(userId: string, partnerId: string) {
    const prepCoursePartner = await this.repository.findOneBy({
      id: partnerId,
    });
    if (!prepCoursePartner) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const user = await this.userService.findOneBy({ id: userId });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    let collaborator: Collaborator = null;
    collaborator = await this.collaboratorRepository.findOneByUserId(user.id);
    if (!collaborator) {
      collaborator = new Collaborator();
      collaborator.user = user;
      collaborator.partnerPrepCourse = prepCoursePartner;
      collaborator.description = '';
      await this.collaboratorRepository.create(collaborator);
    }
    if (
      prepCoursePartner.members &&
      prepCoursePartner.members.find((m) => m.id === collaborator.id)
    ) {
      throw new HttpException(
        'Usuário já é membro desse cursinho parceiro',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!prepCoursePartner.members) {
      prepCoursePartner.members = [collaborator];
    } else {
      if (!prepCoursePartner.members.find((m) => m.id === user.id)) {
        prepCoursePartner.members.push(collaborator);
      }
    }

    await this.repository.update(prepCoursePartner);
  }

  async getByUserId(userId: string): Promise<PartnerPrepCourse> {
    let parnetPrepCourse = null;
    parnetPrepCourse = await this.repository.findOneByUserId(userId);
    if (!parnetPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    return parnetPrepCourse;
  }
}
