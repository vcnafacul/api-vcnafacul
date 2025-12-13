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
import { createThumbnail } from 'src/utils/createThumbnail';
import { DataSource } from 'typeorm';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { PartnerPrepCourseDtoInput } from './dtos/create-partner-prep-course.input.dto';
import { PrepCourseDtoOutput } from './dtos/get-all-prep-course.dto.outoput';
import { GetOnePrepCourseByIdDtoOutput } from './dtos/get-one-prep-course-by-id.dto.output';
import { LogPartner } from './log-partner/log-partner.entity';
import { LogPartnerRepository } from './log-partner/log-partner.repository';
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
    private readonly logPartnerRepository: LogPartnerRepository,
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
  ): Promise<PrepCourseDtoOutput | null | undefined> {
    let partnerPrepCourse: PartnerPrepCourse = null;
    const user = await this.userService.findOneBy({ id: userId });

    const existingCourse = await this.repository.findOneBy({
      geoId: dto.geoId,
    });
    if (existingCourse) {
      throw new HttpException(
        'Cursinho parceiro já existe',
        HttpStatus.CONFLICT,
      );
    }

    const futureRepresentative = await this.userService.findOneBy({
      id: dto.representative,
    });
    if (!futureRepresentative) {
      throw new HttpException(
        'Representante nao encontrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar se o usuário já é representante de outro cursinho
    const existingRepresentative = await this.repository.findOneBy({
      representative: { id: futureRepresentative.id },
    });
    if (existingRepresentative && !dto.force) {
      throw new HttpException(
        'Usuário já é representante de outro cursinho',
        HttpStatus.CONFLICT,
      );
    }

    // Verificar se o colaborador já está associado a outro cursinho
    const existingCollaborador =
      await this.collaboratorRepository.findOneByUserId(
        futureRepresentative.id,
      );
    if (
      existingCollaborador &&
      existingCollaborador.partnerPrepCourse &&
      !dto.force
    ) {
      throw new HttpException(
        'Representante já cadastrado como colaborador em outro cursinho',
        HttpStatus.CONFLICT,
      );
    }
    try {
      await this.dataSource.transaction(async (manager) => {
        // Criar o cursinho primeiro
        partnerPrepCourse = new PartnerPrepCourse();
        partnerPrepCourse.geoId = dto.geoId;
        partnerPrepCourse.representative = futureRepresentative;

        // Salvar o cursinho primeiro
        await manager.getRepository(PartnerPrepCourse).save(partnerPrepCourse);

        // Depois, lidar com o colaborador
        if (!existingCollaborador) {
          const collaborator = new Collaborator();
          collaborator.user = futureRepresentative;
          collaborator.description = 'Representante Cursinho';
          collaborator.partnerPrepCourse = {
            id: partnerPrepCourse.id,
          } as PartnerPrepCourse;
          await manager.getRepository(Collaborator).save(collaborator);
        } else {
          // Atualizar colaborador existente para associar ao novo cursinho
          await manager
            .getRepository(Collaborator)
            .update(existingCollaborador.id, {
              partnerPrepCourse: { id: partnerPrepCourse.id },
              description: 'Representante Cursinho',
            });
        }
        if (partnerPrepCourse) {
          const logGeo = new LogGeo();
          logGeo.geoId = partnerPrepCourse.geoId;
          logGeo.status = StatusLogGeo.Partner;
          logGeo.description = 'Criaçao de cursinho parceiro';
          logGeo.geo = partnerPrepCourse.geo;
          logGeo.user = user;
          await this.logGeoRepository.create(logGeo);

          const logPartner = new LogPartner();
          logPartner.partnerId = partnerPrepCourse.id;
          logPartner.description = `Cursinho parceiro criado por ${user.firstName} ${user.lastName}`;
          // await this.logPartnerRepository.create(logPartner);
        }
      });
    } catch (error) {
      throw new HttpException(
        `Erro ao criar cursinho parceiro: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (partnerPrepCourse) {
      const newPrep = await this.repository.findOneByIdRes(
        partnerPrepCourse.id,
      );
      return {
        id: newPrep.id,
        geo: {
          id: newPrep.geo.id,
          name: newPrep.geo.name,
          category: newPrep.geo.category,
          street: newPrep.geo.street,
          number: newPrep.geo.number,
          complement: newPrep.geo.complement,
          neighborhood: newPrep.geo.neighborhood,
          city: newPrep.geo.city,
          state: newPrep.geo.state,
          phone: newPrep.geo.phone,
        },
        representative: {
          id: newPrep.representative.id,
          name: !newPrep.representative.useSocialName
            ? newPrep.representative.firstName +
              ' ' +
              newPrep.representative.lastName
            : newPrep.representative.socialName +
              ' ' +
              newPrep.representative.lastName,
          email: newPrep.representative.email,
          phone: newPrep.representative.phone,
        },
        logo: newPrep.logo,
        agreement: newPrep.partnershipAgreement,
        thumbnail: newPrep.thumbnail
          ? `data:image/webp;base64,${newPrep.thumbnail.toString('base64')}`
          : null,
        numberStudents: newPrep.students?.length || 0,
        numberMembers: newPrep.members?.length || 0,
        createdAt: newPrep.createdAt,
        updatedAt: newPrep.updatedAt,
      } as unknown as PrepCourseDtoOutput;
    }
    return null;
  }

  async updateLogo(id: string, file: Express.Multer.File) {
    const partnerPrepCourse = await this.repository.findOneBy({ id });
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const logoKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_PARTNERSHIP_DOC'),
    );
    partnerPrepCourse.logo = logoKey;
    const thumbnail = await createThumbnail(file.buffer);
    partnerPrepCourse.thumbnail = thumbnail;
    await this.repository.update(partnerPrepCourse);

    const logPartner = new LogPartner();
    logPartner.partnerId = id;
    logPartner.description = 'Logo do cursinho atualizado';
    await this.logPartnerRepository.create(logPartner);

    return `data:image/webp;base64,${thumbnail.toString('base64')}`;
  }

  async updateAgreement(id: string, file: Express.Multer.File) {
    const partnerPrepCourse = await this.repository.findOneBy({ id });
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const agreementKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_PARTNERSHIP_DOC'),
    );
    partnerPrepCourse.partnershipAgreement = agreementKey;
    await this.repository.update(partnerPrepCourse);

    const logPartner = new LogPartner();
    logPartner.partnerId = id;
    logPartner.description = 'Termo de parceria atualizado';
    await this.logPartnerRepository.create(logPartner);

    return agreementKey;
  }

  async getAgreement(id: string) {
    const partnerPrepCourse = await this.repository.findOneBy({ id });
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const ag = await this.blobService.getFile(
      partnerPrepCourse.partnershipAgreement,
      this.envService.get('BUCKET_PARTNERSHIP_DOC'),
    );
    return ag;
  }

  async getAll(
    page: number,
    limit: number,
  ): Promise<GetAllOutput<PrepCourseDtoOutput>> {
    const prepCourses = await this.repository.findAllBy({
      page: page,
      limit: limit,
    });
    return {
      data: prepCourses.data.map((i) =>
        Object.assign(new PrepCourseDtoOutput(), {
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
            phone: i.geo.phone,
          },
          representative: {
            id: i.representative.id,
            name: !i.representative.useSocialName
              ? i.representative.firstName + ' ' + i.representative.lastName
              : i.representative.socialName + ' ' + i.representative.lastName,
            email: i.representative.email,
            phone: i.representative.phone,
          },
          logo: i.logo,
          agreement: i.partnershipAgreement,
          thumbnail: i.thumbnail
            ? `data:image/webp;base64,${i.thumbnail.toString('base64')}`
            : null,
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

    const logPartner = new LogPartner();
    logPartner.partnerId = prepCourse.id;
    logPartner.description = `Convite enviado para ${user.firstName} ${user.lastName} (${email})`;
    await this.logPartnerRepository.create(logPartner);
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

      const logPartner = new LogPartner();
      logPartner.partnerId = partnerId;
      logPartner.description = `${user.firstName} ${user.lastName} (${user.email}) aceitou convite e entrou como membro`;
      await this.logPartnerRepository.create(logPartner);
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
    const role = await this.roleService.create(dto, partnerPrepCourse);

    const logPartner = new LogPartner();
    logPartner.partnerId = partnerPrepCourse.id;
    logPartner.description = `Cargo "${dto.name}" criado`;
    await this.logPartnerRepository.create(logPartner);

    return role;
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
    const updatedRole = await this.roleService.update(dto);

    const logPartner = new LogPartner();
    logPartner.partnerId = partnerPrepCourse.id;
    logPartner.description = `Cargo "${role.name}" atualizado`;
    await this.logPartnerRepository.create(logPartner);

    return updatedRole;
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

  async updateRepresentative(
    id: string,
    userId: string,
    forceRepresentative: boolean = false,
  ) {
    const user = await this.userService.findOneBy({ id: userId });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const existingCollaborador =
      await this.collaboratorRepository.findOneByUserId(user.id);

    // Verificar se o colaborador já está associado a outro cursinho
    if (
      existingCollaborador &&
      existingCollaborador.partnerPrepCourse?.id !== id &&
      !forceRepresentative
    ) {
      throw new HttpException(
        'Representante já cadastrado como colaborador em outro cursinho',
        HttpStatus.CONFLICT,
      );
    }

    const partnerPrepCourse = await this.repository.findOneBy({ id });
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const colRepository = manager.getRepository(Collaborator);
        const partnerRepository = manager.getRepository(PartnerPrepCourse);

        // Primeiro, atualizar o representante do cursinho
        await partnerRepository.update(
          { id },
          { representative: { id: user.id } },
        );

        // Depois, lidar com o colaborador
        if (existingCollaborador) {
          // Se já existe e não está associado a este cursinho, atualizar a associação
          if (existingCollaborador.partnerPrepCourse?.id !== id) {
            await colRepository.update(existingCollaborador.id, {
              partnerPrepCourse: { id },
              description: 'Representante Cursinho',
            });
          }
        } else {
          // Criar novo colaborador
          const collaborator = new Collaborator();
          collaborator.user = user;
          collaborator.partnerPrepCourse = { id } as PartnerPrepCourse;
          collaborator.description = 'Representante Cursinho';
          await colRepository.save(collaborator);
        }
      });

      this.logger.log(
        JSON.stringify({
          event: 'updateRepresentative',
          status: 'success',
          partnerId: id,
          newRepresentativeId: userId,
          timestamp: new Date().toISOString(),
        }),
      );

      const logPartner = new LogPartner();
      logPartner.partnerId = id;
      logPartner.description = `Representante alterado para ${user.firstName} ${user.lastName} (${user.email})`;
      await this.logPartnerRepository.create(logPartner);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'updateRepresentative',
          status: 'error',
          partnerId: id,
          userId,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }),
      );

      // Re-throw o erro original se for um HttpException
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erro ao atualizar representante',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
