import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { StatusLogGeo } from 'src/modules/geo/enum/status-log-geo';
import { LogGeo } from 'src/modules/geo/log-geo/log-geo.entity';
import { LogGeoRepository } from 'src/modules/geo/log-geo/log-geo.repository';
import { CreateRoleDtoInput } from 'src/modules/role/dto/create-role.dto';
import { UpdateRoleDtoInput } from 'src/modules/role/dto/update.role.dto';
import { Role } from 'src/modules/role/role.entity';
import { RoleService } from 'src/modules/role/role.service';
import { UserService } from 'src/modules/user/user.service';
import { BaseService } from 'src/shared/modules/base/base.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DataSource } from 'typeorm';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
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
    private readonly logGeoRepository: LogGeoRepository,
    private readonly roleService: RoleService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    super(repository);
  }

  private readonly logger = new Logger(PartnerPrepCourseService.name);

  async create(
    dto: PartnerPrepCourseDtoInput,
    userId: string,
  ): Promise<PartnerPrepCourse> {
    let partnerPrepCourse: PartnerPrepCourse = null;
    const user = await this.userService.findOneBy({ id: userId });
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
      const logGeo = new LogGeo();
      logGeo.geoId = partnerPrepCourse.geoId;
      logGeo.status = StatusLogGeo.Partner;
      logGeo.description = 'Criaçao de cursinho parceiro';
      logGeo.geo = partnerPrepCourse.geo;
      logGeo.user = user;
      await this.logGeoRepository.create(logGeo);
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
    this.logger.log(
      JSON.stringify({
        event: 'inviteMember',
        status: 'success',
        guest: email,
        inviter: inviter.email,
        partner: prepCourse.geo.name,
        partnerId: prepCourse.id,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  async inviteMemberAccept(userId: string, partnerId: string) {
    await this.dataSource.transaction(async (manager) => {
      const prepCoursePartner = await manager
        .getRepository(PartnerPrepCourse)
        .findOne({
          where: { id: partnerId },
          relations: ['members'],
        });
      if (!prepCoursePartner) {
        throw new HttpException(
          'Cursinho não encontrado',
          HttpStatus.NOT_FOUND,
        );
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
        await manager.getRepository(Collaborator).save(collaborator);
      }
      if (
        prepCoursePartner.members &&
        prepCoursePartner.members.find((m) => m.id === collaborator.id)
      ) {
        this.logger.warn(
          JSON.stringify({
            event: 'inviteMemberAccept',
            status: 'error',
            userId,
            partnerId,
            reason: 'Usuário já é membro desse cursinho parceiro',
            timestamp: new Date().toISOString(),
          }),
        );
        throw new HttpException(
          'Usuário já é membro desse cursinho parceiro',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!prepCoursePartner.members) {
        prepCoursePartner.members = [collaborator];
      } else {
        prepCoursePartner.members = [
          ...prepCoursePartner.members,
          collaborator,
        ];
      }

      await manager.getRepository(PartnerPrepCourse).save(prepCoursePartner);

      this.logger.log(
        JSON.stringify({
          event: 'inviteMemberAccept',
          status: 'success',
          userId,
          guest: user.email,
          partnerId,
          timestamp: new Date().toISOString(),
        }),
      );
    });
  }

  async getByUserId(userId: string): Promise<PartnerPrepCourse> {
    let parnetPrepCourse = null;
    parnetPrepCourse = await this.repository.findOneByUserId(userId);
    if (!parnetPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    return parnetPrepCourse;
  }

  async getBaseRoles(userId: string): Promise<Role[]> {
    const partnerPrepCourse = await this.repository.findOneByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const roles = await this.roleService.findAllBy({
      page: 1,
      limit: 1000,
      where: {
        base: true,
      },
    });
    return roles.data;
  }

  async createRole(dto: CreateRoleDtoInput, userId: string) {
    const partnerPrepCourse = await this.repository.findOneByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    return await this.roleService.create(dto, partnerPrepCourse);
  }

  async getRoles(userId: string): Promise<Role[]> {
    const partnerPrepCourse = await this.repository.findOneByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const roles = await this.roleService.findAllBy({
      page: 1,
      limit: 1000,
      where: {
        partnerPrepCourse,
      },
    });
    return roles.data;
  }

  async updateRole(dto: UpdateRoleDtoInput, userId: string) {
    const partnerPrepCourse = await this.repository.findOneByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const role = await this.roleService.findOneByIdWithPartner(dto.id);
    if (!role) {
      throw new HttpException('Role nao encontrada', HttpStatus.NOT_FOUND);
    }
    if (role.partnerPrepCourse.id !== partnerPrepCourse.id) {
      throw new HttpException(
        'Role nao pertence ao cursinho parceiro',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.roleService.update(dto);
  }
}
