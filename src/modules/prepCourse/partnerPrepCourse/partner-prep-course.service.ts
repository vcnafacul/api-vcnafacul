import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
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
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DataSource } from 'typeorm';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { GetAllPrepCourseDtoOutput } from './dtos/get-all-prep-course.dto.outoput';
import { GetOnePrepCourseByIdDtoOutput } from './dtos/get-one-prep-course-by-id.dto.output';
import { PartnerPrepCourse } from './partner-prep-course.entity';
import { PartnerPrepCourseRepository } from './partner-prep-course.repository';
import { createTermOfUse } from './utils/create-term-of-use';

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
    @Inject('BlobService') private readonly blobService: BlobService,
    @InjectDataSource()
    private dataSource: DataSource,
    private envService: EnvService,
    private readonly cache: CacheService,
  ) {
    super(repository);
  }

  private readonly logger = new Logger(PartnerPrepCourseService.name);

  async create(
    dto: PartnerPrepCourseDtoInput,
    userId: string,
    partnershipAgreement?: Express.Multer.File,
    logo?: Express.Multer.File,
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

      const representative = await this.userService.findOneBy({
        id: dto.representative,
      });
      if (!representative) {
        throw new HttpException(
          'Representante nao encontrado',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingCollaborador = await manager
        .getRepository(Collaborator)
        .findOneBy({ user: { id: representative.id } });
      if (existingCollaborador) {
        throw new HttpException(
          'Representante ja cadastrado como colaborador',
          HttpStatus.CONFLICT,
        );
      }

      partnerPrepCourse = new PartnerPrepCourse();

      const agreementKey = await this.blobService.uploadFile(
        partnershipAgreement,
        this.envService.get('BUCKET_PARTNERSHIP_DOC'),
      );
      partnerPrepCourse.partnershipAgreement = agreementKey;
      if (logo) {
        const logoKey = await this.blobService.uploadFile(
          logo,
          this.envService.get('BUCKET_PARTNERSHIP_DOC'),
        );
        partnerPrepCourse.logo = logoKey;
      }

      partnerPrepCourse.geoId = dto.geoId;
      partnerPrepCourse.representative = representative;

      const collaborator = new Collaborator();
      collaborator.user = representative;
      collaborator.description = 'Representante Cursinho';

      collaborator.partnerPrepCourse = partnerPrepCourse;

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

  async getAll(
    page: number,
    limit: number,
  ): Promise<GetAllOutput<GetAllPrepCourseDtoOutput>> {
    const prepCourses = await this.repository.findAllBy({
      page: page,
      limit: limit,
    });
    return {
      data: prepCourses.data.map((i) =>
        Object.assign(new GetAllPrepCourseDtoOutput(), {
          id: i.id,
          geo: {
            id: i.geo.id,
            name: i.geo.name,
            category: i.geo.category,
            street: i.geo.street,
            number: i.geo.number,
            complement: i.geo.complement,
            neighborhood: i.geo.neighborhood,
            city: i.geo.city,
            state: i.geo.state,
          },
          representative: {
            id: i.representative.id,
            name: i.representative.useSocialName
              ? i.representative.firstName + ' ' + i.representative.lastName
              : i.representative.socialName + ' ' + i.representative.lastName,
            email: i.representative.email,
            phone: i.representative.phone,
          },
          logo: i.logo,
          numberStudents: i.students?.length || 0,
          numberMembers: i.members?.length || 0,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        }),
      ),
      page: prepCourses.page,
      limit: prepCourses.limit,
      totalItems: prepCourses.totalItems,
    };
  }

  async getOneById(id: string): Promise<GetOnePrepCourseByIdDtoOutput> {
    const prepCourses = await this.repository.findOneById(id);
    return Object.assign(new GetOnePrepCourseByIdDtoOutput(), {
      id: prepCourses.id,
      geo: prepCourses.geo,
      representative: {
        name: prepCourses.representative.useSocialName
          ? prepCourses.representative.firstName +
            ' ' +
            prepCourses.representative.lastName
          : prepCourses.representative.socialName +
            ' ' +
            prepCourses.representative.lastName,
        email: prepCourses.representative.email,
        phone: prepCourses.representative.phone,
      },
      partnershipAgreement: prepCourses.partnershipAgreement,
      logo: prepCourses.logo,
      numberMembers: prepCourses.members?.length || 0,
      numberStudents: prepCourses.students?.length || 0,
      createdAt: prepCourses.createdAt,
      updatedAt: prepCourses.updatedAt,
    });
  }

  async update(entity: PartnerPrepCourse): Promise<void> {
    await this.repository.update(entity);
  }

  async inviteMember(email: string, userId: string) {
    const inviter = await this.userService.findOneBy({ id: userId });
    const prepCourse = await this.getByUserId(userId);

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
      throw new HttpException(
        'Cursinho parceiro não encontrado',
        HttpStatus.NOT_FOUND,
      );
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
      throw new HttpException('Role não encontrada', HttpStatus.NOT_FOUND);
    }
    if (role.partnerPrepCourse.id !== partnerPrepCourse.id) {
      throw new HttpException(
        'Role não pertence ao cursinho parceiro',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.roleService.update(dto);
  }

  async getSummary() {
    return await this.cache.wrap<number>('partnerPrepCourse:total', async () =>
      this.repository.getTotalEntity(),
    );
  }

  async getTermOfUse(ParnerId: string) {
    const partnerPrepCourse = await this.repository.findOneById(ParnerId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    return createTermOfUse(
      this.blobService,
      this.envService,
      this.cache,
      partnerPrepCourse.geo.name,
      partnerPrepCourse.geo.email,
    );
  }
}
