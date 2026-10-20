import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { UserService } from 'src/modules/user/user.service';
import { cleanString } from 'src/utils/cleanString';
import { extrairYoutubeId } from './youtube-id';
import { EventoDaTimeline, montarTimeline } from './content-timeline';

@Injectable()
export class ContentProxyService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
    private readonly userService: UserService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  /**
   * Nomes de exibição para um conjunto de ids, numa consulta só. Id sem
   * usuário (ou falha no banco) devolve o próprio id, como antes.
   *
   * ⚠️ Era um `findUserById` por item: a lista de propostas e o histórico
   * faziam N consultas, e a listagem de demandas não resolvia nome nenhum.
   */
  private async nomesDe(ids: (string | undefined)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    const nomes = new Map<string, string>();
    try {
      const achados = await this.userService.findNomesPorIds(unicos);
      achados.forEach((nome, id) => nomes.set(id, nome));
    } catch {
      // sem nome, fica o id
    }
    unicos.forEach((id) => nomes.has(id) || nomes.set(id, id));
    return nomes;
  }

  /**
   * Anexa `createdByName` (quem abriu a demanda) e `uploadedByName` (quem
   * enviou o arquivo vigente) a cada conteúdo. Quem fez a última edição
   * continua em `lastEditedByName`.
   */
  private async comNomes<T extends Record<string, any>>(
    conteudos: T[],
  ): Promise<T[]> {
    const nomes = await this.nomesDe(
      conteudos.flatMap((c) => [
        c.userId,
        c.file?.uploadedBy,
        c.lastEditedBy,
        c.approvedBy,
      ]),
    );
    return conteudos.map((c) => ({
      ...c,
      ...(c.userId ? { createdByName: nomes.get(c.userId) } : {}),
      ...(c.file?.uploadedBy
        ? { uploadedByName: nomes.get(c.file.uploadedBy) }
        : {}),
      ...(c.lastEditedBy
        ? { lastEditedByName: nomes.get(c.lastEditedBy) }
        : {}),
      ...(c.approvedBy ? { approvedByName: nomes.get(c.approvedBy) } : {}),
    }));
  }

  /**
   * Linha do tempo da demanda (050/02): os quatro cadastros do ms em
   * paralelo, montados em eventos, nomes resolvidos num lote só.
   */
  async getTimeline(contentId: string): Promise<{ eventos: EventoDaTimeline[] }> {
    const content = await this.axios.get<any>(
      `v1/content/${contentId}/populated`,
    );
    if (!content) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }
    const [historico, propostas, auditLog] = await Promise.all([
      this.axios.get<any[]>(`v1/content-file-history/content/${contentId}`),
      this.axios.get<any[]>(`v1/adjustment-proposal/content/${contentId}`),
      this.axios.get<any[]>(`v1/auditLog/${contentId}`),
    ]);
    const eventos = montarTimeline({
      content,
      historico: Array.isArray(historico) ? historico : [],
      propostas: Array.isArray(propostas) ? propostas : [],
      auditLog: Array.isArray(auditLog) ? auditLog : [],
    });
    const nomes = await this.nomesDe(eventos.map((e) => e.porId));
    return {
      eventos: eventos.map((e) => ({ ...e, por: nomes.get(e.porId) ?? e.porId })),
    };
  }

  async create(body: any, userId: string) {
    const { subjectId, ...rest } = body;
    return await this.axios.post('v1/content', {
      ...rest,
      subject: subjectId,
      userId,
    });
  }

  async getAll(query: Record<string, any>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const pagina = await this.axios.get<any>(
      `v1/content?${params.toString()}`,
    );
    if (!Array.isArray(pagina?.data)) return pagina;
    return { ...pagina, data: await this.comNomes(pagina.data) };
  }

  /**
   * ⚠️ A rota populada, não a crua: só ela traz `file.uploadedBy` (e o tema
   * com frente e matéria). O client não chama este GET hoje; o painel lê a
   * listagem.
   */
  async getById(id: string) {
    const content = await this.axios.get<any>(`v1/content/${id}/populated`);
    if (!content) return content;
    const [comNomes] = await this.comNomes([content]);
    return comNomes;
  }

  async getBySubject(subjectId: string, status?: number) {
    let url = `v1/content/subject/${subjectId}`;
    if (status !== undefined) url += `?status=${status}`;
    return await this.axios.get(url);
  }

  async getDemands(page: number, limit: number) {
    return await this.axios.get(
      `v1/content/demand?page=${page}&limit=${limit}`,
    );
  }

  async changeStatus(
    id: string,
    status: number,
    userId: string,
    reason?: string,
  ) {
    const result = await this.axios.patch(`v1/content/${id}/status`, {
      status,
      userId,
      // O ms grava o motivo na demanda (`rejectionReason`) e no AuditLog.
      ...(reason ? { message: reason } : {}),
    });
    await this.invalidateContentCaches(id);
    return result;
  }

  private async invalidateContentCaches(contentId: string) {
    try {
      const content = await this.axios.get<any>(
        `v1/content/${contentId}/populated`,
      );
      const materiaId =
        content?.subject?.frente?.materia?._id ||
        content?.subject?.frente?.materia;
      if (materiaId) {
        await this.cache.del(`frente:materiawithcontent:${materiaId}`);
      }
    } catch {
      // ignore cache invalidation errors
    }
    await this.cache.del('content:summary');
    await this.cache.del('content:stats-by-frente');
  }

  async reset(id: string, userId: string) {
    const result = await this.axios.patch(`v1/content/${id}/reset`, {
      userId,
    });
    await this.invalidateContentCaches(id);
    return result;
  }

  async uploadFile(id: string, userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('file not found', HttpStatus.BAD_REQUEST);
    }

    const content = await this.axios.get<any>(`v1/content/${id}/populated`);
    if (!content) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }

    const directory = this.getDirectory(content);
    const fileKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_CONTENT'),
      undefined,
      directory,
    );

    if (!fileKey) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }

    await this.axios.post('v1/file-content', {
      fileKey,
      originalName: file.originalname,
      content: id,
      uploadedBy: userId,
    });

    return { fileKey };
  }

  static readonly MENSAGEM_LINK_INVALIDO =
    'Informe um link do YouTube válido (vídeo normal, não Shorts ou live).';

  /**
   * Envio de vídeo: o mesmo "upload" do documento, sem R2. O ms grava um
   * `FileContent` de tipo vídeo, que vira o vigente (status → Pending).
   * Como o upload, não mexe em cache: Pending não entra na lista do aluno.
   */
  async sendVideo(id: string, userId: string, url: string) {
    const videoId = extrairYoutubeId(url);
    if (!videoId) {
      throw new HttpException(
        ContentProxyService.MENSAGEM_LINK_INVALIDO,
        HttpStatus.BAD_REQUEST,
      );
    }
    const content = await this.axios.get<any>(`v1/content/${id}/populated`);
    if (!content) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }
    await this.axios.post('v1/file-content', {
      tipo: 'video',
      videoId,
      content: id,
      uploadedBy: userId,
    });
    return { videoId };
  }

  private getDirectory(content: any): string {
    const title = cleanString(content.title);
    const subjectName = cleanString(content.subject?.name || '');
    const frenteName = cleanString(content.subject?.frente?.nome || '');
    const materiaName = cleanString(
      content.subject?.frente?.materia?.nome || '',
    );
    return `${materiaName}/${frenteName}/${subjectName}/${title}`;
  }

  async getFile(fileContentId: string) {
    const fileContent = await this.axios.get<any>(
      `v1/file-content/${fileContentId}`,
    );
    if (!fileContent) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    // O player usa o `videoId` que já vem na listagem; aqui não há o que baixar.
    if (fileContent.tipo === 'video' || !fileContent.fileKey) {
      throw new HttpException(
        'Conteúdo em vídeo não tem arquivo para baixar',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.blobService.getFile(
      fileContent.fileKey,
      this.envService.get('BUCKET_CONTENT'),
    );
  }

  async delete(id: string) {
    const fileContents = await this.axios.get<any[]>(
      `v1/file-content/content/${id}`,
    );

    if (fileContents && Array.isArray(fileContents)) {
      for (const fc of fileContents) {
        // Vídeo não tem nada no R2; só o registro no ms.
        if (fc.fileKey) {
          await this.blobService.deleteFile(
            fc.fileKey,
            this.envService.get('BUCKET_CONTENT'),
          );
        }
        await this.axios.delete(`v1/file-content/${fc._id}`);
      }
    }

    return await this.axios.delete(`v1/content/${id}`);
  }

  async changeOrder(body: { orderedIds: string[] }) {
    return await this.axios.patch('v1/content/reorder', {
      orderedIds: body.orderedIds,
    });
  }

  async getSummary() {
    return this.cache.wrap<object>(
      'content:summary',
      async () => await this.axios.get<any>('v1/content/summary'),
    );
  }

  async getStatsByFrente() {
    return this.cache.wrap<object>(
      'content:stats-by-frente',
      async () => await this.axios.get<any>('v1/content/stats-by-frente'),
    );
  }

  async getSnapshotContentStatus() {
    return this.cache.wrap<object>(
      'content:snapshot-content-status',
      async () =>
        await this.axios.get<any>('v1/content/snapshot-content-status'),
    );
  }

  /**
   * Proposta de ajuste: um `.docx` OU um link do YouTube, mais um comentário.
   * O `FileContent` da proposta nasce "standalone" (não vira vigente); virar
   * vigente é a aprovação. Pode trocar o tipo do conteúdo (tickets/049, D4).
   */
  async uploadProposal(
    contentId: string,
    userId: string,
    file?: Express.Multer.File,
    comment?: string,
    url?: string,
  ) {
    if (!file && !url) {
      throw new HttpException(
        'Envie um arquivo .docx ou um link do YouTube',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file && url) {
      throw new HttpException(
        'Envie o arquivo OU o link, não os dois',
        HttpStatus.BAD_REQUEST,
      );
    }
    const videoId = url ? extrairYoutubeId(url) : null;
    if (url && !videoId) {
      throw new HttpException(
        ContentProxyService.MENSAGEM_LINK_INVALIDO,
        HttpStatus.BAD_REQUEST,
      );
    }

    const content = await this.axios.get<any>(
      `v1/content/${contentId}/populated`,
    );
    if (!content) {
      throw new HttpException('demand not found', HttpStatus.NOT_FOUND);
    }

    let versao: { _id: string };
    if (videoId) {
      versao = await this.axios.post<any>('v1/file-content/standalone', {
        tipo: 'video',
        videoId,
        content: contentId,
        uploadedBy: userId,
      });
    } else {
      const directory = this.getDirectory(content);
      const fileKey = await this.blobService.uploadFile(
        file,
        this.envService.get('BUCKET_CONTENT'),
        undefined,
        directory,
      );
      if (!fileKey) {
        throw new HttpException(
          'error to upload file',
          HttpStatus.BAD_REQUEST,
        );
      }
      versao = await this.axios.post<any>('v1/file-content/standalone', {
        fileKey,
        originalName: file.originalname,
        content: contentId,
        uploadedBy: userId,
      });
    }

    return await this.axios.post('v1/adjustment-proposal', {
      content: contentId,
      file: versao._id,
      author: userId,
      comment,
    });
  }

  async getProposalsByContent(contentId: string) {
    const proposals = await this.axios.get<any[]>(
      `v1/adjustment-proposal/content/${contentId}`,
    );
    if (!proposals || !Array.isArray(proposals)) return proposals;

    const nomes = await this.nomesDe(
      proposals.flatMap((p) => [p.author, p.reviewedBy]),
    );
    return proposals.map((p) => ({
      ...p,
      authorName: nomes.get(p.author),
      ...(p.reviewedBy ? { reviewedByName: nomes.get(p.reviewedBy) } : {}),
    }));
  }

  async reviewProposal(proposalId: string, status: number, reviewedBy: string) {
    const result = await this.axios.patch(
      `v1/adjustment-proposal/${proposalId}/review`,
      { status, reviewedBy },
    );

    if (status === 1) {
      try {
        const proposal = await this.axios.get<any>(
          `v1/adjustment-proposal/${proposalId}`,
        );
        if (proposal?.content) {
          const contentId =
            typeof proposal.content === 'string'
              ? proposal.content
              : proposal.content._id;
          await this.invalidateContentCaches(contentId);
        }
      } catch {
        // ignore cache invalidation errors
      }
    }

    return result;
  }

  async getFileHistory(contentId: string) {
    const history = await this.axios.get<any[]>(
      `v1/content-file-history/content/${contentId}`,
    );
    if (!history || !Array.isArray(history)) return history;

    const nomes = await this.nomesDe(history.map((h) => h.uploadedBy));
    return history.map((h) => ({
      ...h,
      uploadedByName: nomes.get(h.uploadedBy),
    }));
  }
}
