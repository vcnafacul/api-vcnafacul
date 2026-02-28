import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { Collaborator } from '../collaborator/collaborator.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { FrenteProxyService } from 'src/modules/simulado/frente/frente.service';
import { MateriaProxyService } from 'src/modules/simulado/materia/materia.service';
import { CollaboratorFrente } from './collaborator-frente.entity';
import { CollaboratorFrenteRepository } from './collaborator-frente.repository';
import { CollaboratorRepository } from './collaborator.repository';
import {
  CollaboratorFrentesDtoOutput,
  AfinidadeDto,
} from './dtos/collaborator-frentes.dto.output';
import { CollaboratorVolunteerDtoOutput } from './dtos/collaborator-volunteer.dto.output';
import { GetAllCollaboratorDtoInput } from './dtos/get-all-collaborator.dto.input';
import { CollaboratorDTOOutput } from './dtos/get-all-collaborator.dto.output';

@Injectable()
export class CollaboratorService extends BaseService<Collaborator> {
  private readonly logger = new Logger(CollaboratorService.name);
  constructor(
    private readonly repository: CollaboratorRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private envService: EnvService,
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
    private readonly collaboratorFrenteRepository: CollaboratorFrenteRepository,
    private readonly frenteProxyService: FrenteProxyService,
    private readonly materiaProxyService: MateriaProxyService,
  ) {
    super(repository);
  }

  async getCollaborator({
    page,
    limit,
    userId,
  }: GetAllCollaboratorDtoInput): Promise<GetAllOutput<CollaboratorDTOOutput>> {
    const partnerPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const data = await this.repository.findAllBy({
      where: { partnerPrepCourse },
      limit: limit,
      page: page,
    });
    if (!data) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    const result: CollaboratorDTOOutput[] = data.data.map((c) => ({
      id: c.id,
      photo: c.photo,
      description: c.description,
      actived: c.actived,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: {
        id: c.user.id,
        name: c.user.useSocialName
          ? `${c.user.socialName} ${c.user.lastName}`
          : `${c.user.firstName} ${c.user.lastName}`,
        email: c.user.email,
        phone: c.user.phone,
        role: {
          id: c.user.role.id,
          name: c.user.role.name,
        },
        lastAccess: c.user.lastAccess,
      },
    }));
    return {
      data: result,
      totalItems: data.totalItems,
      page: data.page,
      limit: data.limit,
    };
  }

  async getCollaboratorByPrepPartner(
    id: string,
  ): Promise<CollaboratorVolunteerDtoOutput[]> {
    const collaborator = await this.repository.findOneByPrepPartner(id);
    return collaborator.map((c) => ({
      name: c.user.useSocialName
        ? `${c.user.socialName} ${c.user.lastName}`
        : `${c.user.firstName} ${c.user.lastName}`,
      description: c.description,
      image: c.photo,
      actived: c.actived,
    }));
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const collaborator = await this.repository.findOneByUserId(userId);
    if (collaborator.photo) {
      try {
        await this.blobService.deleteFile(
          collaborator.photo,
          this.envService.get('BUCKET_DOC'),
        );
        await this.cache.del(`collaborator:photo:${collaborator.photo}`);
      } catch (error) {
        this.logger.error(`Error to delete file ${collaborator.photo}`, error);
      }
    }
    const fileName = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_DOC'),
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    collaborator.photo = fileName;
    await this.repository.update(collaborator);
    const buffer = await this.blobService.getFile(
      fileName,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.set(
      `collaborator:photo:${fileName}`,
      buffer,
      60 * 60 * 24 * 1000 * 7,
    );
    return fileName;
  }

  async removeImage(userId: string): Promise<boolean> {
    const collaborator = await this.repository.findOneByUserId(userId);
    await this.blobService.deleteFile(
      collaborator.photo,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.del(`collaborator:photo:${collaborator.photo}`);
    collaborator.photo = null;
    await this.repository.update(collaborator);
    return true;
  }

  async changeActive(id: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.actived = !collaborator.actived;
    if (!collaborator.actived) {
      const user = await this.userRepository.findOneBy({
        id: collaborator.user.id,
      });
      const aluno = await this.roleRepository.findOneBy({ name: 'aluno' });
      user.role = aluno;
      await this.userRepository.update(user);
    }
    await this.repository.update(collaborator);
    return collaborator;
  }

  async changeDescription(id: string, description: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.description = description;
    await this.repository.update(collaborator);
    return collaborator;
  }

  async getPhoto(imageKey: string) {
    const cachedFile = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      `collaborator:photo:${imageKey}`,
      async () => {
        return await this.blobService.getFile(
          imageKey,
          this.envService.get('BUCKET_DOC'),
        );
      },
      60 * 60 * 24 * 1000 * 7,
    );
    return cachedFile;
  }

  async findCollaboratorByUserId(userId: string): Promise<Collaborator> {
    const collaborator = await this.repository.findOneByUserId(userId);
    if (!collaborator) {
      throw new HttpException('Collaborator not found', HttpStatus.NOT_FOUND);
    }
    return collaborator;
  }

  async updateFrentes(
    collaboratorId: string,
    frenteIds: string[],
  ): Promise<void> {
    await this.collaboratorFrenteRepository.deleteByCollaboratorId(
      collaboratorId,
    );
    const entities = frenteIds.map((frenteId) =>
      Object.assign(new CollaboratorFrente(), { collaboratorId, frenteId }),
    );
    await this.collaboratorFrenteRepository.createMany(entities);
  }

  async getEnrichedFrentes(
    collaboratorId: string,
  ): Promise<CollaboratorFrentesDtoOutput> {
    const records =
      await this.collaboratorFrenteRepository.findByCollaboratorId(
        collaboratorId,
      );
    const frenteIdsUnicos = [...new Set(records.map((r) => r.frenteId))];

    const frenteResults = await Promise.all(
      frenteIdsUnicos.map((id) =>
        this.frenteProxyService.getById(id).catch(() => null),
      ),
    );
    const validFrentes = frenteResults.filter(Boolean) as any[];

    const frentesPorId = new Map<string, (typeof validFrentes)[number]>();
    for (const f of validFrentes) {
      const id = String(f._id);
      if (!frentesPorId.has(id)) frentesPorId.set(id, f);
    }

    const uniqueMateriaIds = [
      ...new Set([...frentesPorId.values()].map((f) => String(f.materia))),
    ];
    const materiaResults = await Promise.all(
      uniqueMateriaIds.map((id) =>
        this.materiaProxyService.getById(id).catch(() => null),
      ),
    );
    const validMaterias = materiaResults.filter(Boolean) as any[];
    const materiaPorId = new Map<string, (typeof validMaterias)[number]>();
    for (const m of validMaterias) {
      const id = String(m._id);
      if (!materiaPorId.has(id)) materiaPorId.set(id, m);
    }

    return {
      collaboratorId,
      frentes: [...frentesPorId.values()].map((f) => ({
        id: String(f._id),
        nome: f.nome,
        materia: String(f.materia),
      })),
      materias: [...materiaPorId.values()].map((m) => ({
        id: String(m._id),
        nome: m.nome,
      })),
    };
  }

  async getAfinidades(collaboratorId: string): Promise<AfinidadeDto[]> {
    const records =
      await this.collaboratorFrenteRepository.findByCollaboratorId(
        collaboratorId,
      );
    const frenteIds = records.map((r) => r.frenteId);

    const frenteResults = await Promise.all(
      frenteIds.map(async (id) => {
        try {
          const frente = await this.frenteProxyService.getById(id);
          const record = records.find((r) => r.frenteId === id);
          return { frente, record };
        } catch {
          return null;
        }
      }),
    );
    const valid = frenteResults.filter(Boolean) as {
      frente: any;
      record: CollaboratorFrente;
    }[];

    const uniqueMateriaIds = [
      ...new Set(valid.map((v) => String(v.frente.materia))),
    ];
    const materiaResults = await Promise.all(
      uniqueMateriaIds.map((id) =>
        this.materiaProxyService.getById(id).catch(() => null),
      ),
    );
    const validMaterias = materiaResults.filter(Boolean) as any[];
    const materiaMap = new Map(
      validMaterias.map((m) => [String(m._id), m]),
    );

    return valid.map(({ frente, record }) => {
      const materiaId = String(frente.materia);
      const materia = materiaMap.get(materiaId);
      return {
        frenteId: String(frente._id),
        frenteNome: frente.nome,
        materiaId,
        materiaNome: materia?.nome ?? '',
        adicionadoEm: record.createdAt,
      };
    });
  }
}
