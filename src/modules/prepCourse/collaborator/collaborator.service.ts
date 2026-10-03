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
import { chaveDosColaboradoresDoCursinho } from './cache-dos-colaboradores';
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
import { LogPartner } from '../partnerPrepCourse/log-partner/log-partner.entity';
import { LogPartnerRepository } from '../partnerPrepCourse/log-partner/log-partner.repository';
import {
  motivosParaNaoAtivar,
  TEXTO_DO_MOTIVO_DE_ATIVACAO,
} from '../partnerPrepCourse/atribuicao-de-funcao';

/** Resposta de `PATCH collaborator/:id/active`. */
export type ResultadoDaAtivacao = {
  id: string;
  actived: boolean;
  /** A função do usuário depois da ação, para a tela atualizar. */
  role: { id: string; name: string } | null;
  /** Reativou devolvendo a função de antes da inativação. */
  funcaoRestaurada: boolean;
};

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
    private readonly logPartnerRepository: LogPartnerRepository,
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
    return this.replacePhoto(collaborator, file);
  }

  async uploadImageByCollaboratorId(
    file: Express.Multer.File,
    collaboratorId: string,
  ): Promise<string> {
    const collaborator = await this.repository.findOneBy({
      id: collaboratorId,
    });
    if (!collaborator) {
      throw new HttpException('Collaborator not found', HttpStatus.NOT_FOUND);
    }
    return this.replacePhoto(collaborator, file);
  }

  private async replacePhoto(
    collaborator: Collaborator,
    file: Express.Multer.File,
  ): Promise<string> {
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
      undefined,
      'collaborators',
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    collaborator.photo = fileName;
    await this.repository.update(collaborator);
    await this.limparCacheDaPagina(collaborator.id);
    const buffer = await this.blobService.getFile(
      fileName,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.set(
      `collaborator:photo:${fileName}`,
      buffer,
      1000 * 60 * 60 * 24 * 30,
    );
    return fileName;
  }

  async removeImage(userId: string): Promise<boolean> {
    const collaborator = await this.repository.findOneByUserId(userId);
    return this.removerFoto(collaborator);
  }

  /** O admin do cursinho remove a foto de um colaborador (par do upload admin). */
  async removeImageByCollaboratorId(collaboratorId: string): Promise<boolean> {
    const collaborator = await this.repository.findOneBy({
      id: collaboratorId,
    });
    if (!collaborator) {
      throw new HttpException('Collaborator not found', HttpStatus.NOT_FOUND);
    }
    // Sem foto não há o que apagar no bucket: idempotente.
    if (!collaborator.photo) return true;
    return this.removerFoto(collaborator);
  }

  private async removerFoto(collaborator: Collaborator): Promise<boolean> {
    await this.blobService.deleteFile(
      collaborator.photo,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.del(`collaborator:photo:${collaborator.photo}`);
    collaborator.photo = null;
    await this.repository.update(collaborator);
    await this.limparCacheDaPagina(collaborator.id);
    return true;
  }

  /**
   * Inativa ou reativa um colaborador do cursinho de quem pede
   * (tickets-documentacao, card 02).
   *
   * - Inativar guarda a função atual e troca para `aluno`; reativar devolve a
   *   guardada (se ainda for do cursinho) — `funcaoRestaurada` diz se deu.
   * - `actived` é a intenção explícita; sem ele, alterna (o client antigo).
   *   Pedir o estado que já está não muda nada.
   *
   * ⚠️ Ordem das gravações: se a segunda falhar, repetir a ação conserta —
   * a função guardada só é apagada depois de devolvida.
   */
  async changeActive(
    id: string,
    quemPedeId: string,
    actived?: boolean,
  ): Promise<ResultadoDaAtivacao> {
    const cursinho =
      await this.partnerPrepCourseService.getByUserId(quemPedeId);
    const [collaborator, quemPede] = await Promise.all([
      this.repository.findOneParaAtivacao(id),
      this.userRepository.findOneBy({ id: quemPedeId }),
    ]);
    if (!collaborator) {
      throw new HttpException(
        'Colaborador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const ativar = actived ?? !collaborator.actived;
    const user = collaborator.user;
    const funcaoEmJogo = ativar ? collaborator.roleBeforeInactive : user.role;

    const motivos = motivosParaNaoAtivar({
      quemPedeId,
      quemPedeEhAdmin: !!quemPede?.role?.gerenciarPermissoesCursinho,
      cursinhoId: cursinho.id,
      alvo: {
        userId: user.id,
        cursinhoId: collaborator.partnerPrepCourse?.id ?? null,
        ehAdmin: !!funcaoEmJogo?.gerenciarPermissoesCursinho,
      },
    });
    if (motivos.length > 0) {
      throw new HttpException(
        motivos.map((m) => TEXTO_DO_MOTIVO_DE_ATIVACAO[m]).join(' '),
        HttpStatus.FORBIDDEN,
      );
    }

    if (ativar === collaborator.actived) {
      return this.resultadoDaAtivacao(collaborator, false);
    }

    let funcaoRestaurada = false;
    if (!ativar) {
      collaborator.roleBeforeInactive = user.role ?? null;
      collaborator.actived = false;
      await this.repository.update(collaborator);
      user.role = await this.roleRepository.findOneBy({ name: 'aluno' });
      await this.userRepository.update(user);
    } else {
      const anterior = collaborator.roleBeforeInactive;
      // Só função do próprio cursinho volta: uma da plataforma não é dele dar.
      if (anterior && anterior.partnerPrepCourse?.id === cursinho.id) {
        user.role = anterior;
        await this.userRepository.update(user);
        funcaoRestaurada = true;
      }
      collaborator.roleBeforeInactive = null;
      collaborator.actived = true;
      await this.repository.update(collaborator);
    }

    const nome = `${user.firstName} ${user.lastName}`;
    const log = new LogPartner();
    log.partnerId = cursinho.id;
    log.description = !ativar
      ? `Colaborador ${nome} inativado`
      : funcaoRestaurada
        ? `Colaborador ${nome} reativado com a função "${user.role.name}"`
        : `Colaborador ${nome} reativado sem função anterior para devolver`;
    await this.logPartnerRepository.create(log);

    await this.limparCacheDaPagina(collaborator.id);
    return this.resultadoDaAtivacao(collaborator, funcaoRestaurada);
  }

  private resultadoDaAtivacao(
    c: Collaborator,
    funcaoRestaurada: boolean,
  ): ResultadoDaAtivacao {
    return {
      id: c.id,
      actived: c.actived,
      role: c.user.role ? { id: c.user.role.id, name: c.user.role.name } : null,
      funcaoRestaurada,
    };
  }

  async changeDescription(id: string, quemPedeId: string, description: string) {
    const cursinho =
      await this.partnerPrepCourseService.getByUserId(quemPedeId);
    const collaborator = await this.repository.findOneBy({ id });
    if (
      !collaborator ||
      (await this.repository.cursinhoDoColaborador(id)) !== cursinho.id
    ) {
      throw new HttpException(
        'Colaborador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    collaborator.description = description;
    await this.repository.update(collaborator);
    await this.limparCacheDaPagina(collaborator.id);
    return collaborator;
  }

  /**
   * A página pública do cursinho (tickets/025) guarda a lista de
   * colaboradores em cache: ativar/desativar, foto e descrição têm de aparecer
   * na hora. Best-effort — o cache expira sozinho de qualquer forma.
   */
  private async limparCacheDaPagina(collaboratorId: string): Promise<void> {
    try {
      const cursinhoId =
        await this.repository.cursinhoDoColaborador(collaboratorId);
      if (cursinhoId) {
        await this.cache.del(chaveDosColaboradoresDoCursinho(cursinhoId));
      }
    } catch (err) {
      this.logger.warn(`Cache da página não foi limpo: ${err}`);
    }
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
      1000 * 60 * 60 * 24 * 30,
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

    // Invalidate collaborator dashboard cache
    const collaborator = await this.repository.findOneBy({
      id: collaboratorId,
    });
    if (collaborator?.user?.id) {
      await this.cache.del(`dashboard:collab:${collaborator.user.id}`);
    }
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

  async getFrentesBatch(userId: string): Promise<Record<string, string[]>> {
    const partnerPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const collaborators = await this.repository.findOneByPrepPartner(
      partnerPrepCourse.id,
    );
    const collaboratorIds = collaborators.map((c) => c.id);
    const records =
      await this.collaboratorFrenteRepository.findByCollaboratorIds(
        collaboratorIds,
      );
    const map: Record<string, string[]> = {};
    for (const record of records) {
      if (!map[record.collaboratorId]) {
        map[record.collaboratorId] = [];
      }
      map[record.collaboratorId].push(record.frenteId);
    }
    return map;
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
    const materiaMap = new Map(validMaterias.map((m) => [String(m._id), m]));

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
