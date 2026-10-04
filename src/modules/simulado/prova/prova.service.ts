import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { CreateProvaDTORequest } from '../dtos/prova-create.dto.request';
import { Ator, headerDoAtor } from '../ator/ator';
import { CursinhoNomeService } from './cursinho/cursinho-nome.service';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';

@Injectable()
export class ProvaService {
  private readonly axios: HttpServiceAxios;
  private readonly logger = new Logger(ProvaService.name);

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
    private readonly cursinhoNome?: CursinhoNomeService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  /**
   * Liga/desliga o "aplicar novas versões automaticamente" da prova
   * (tickets/023, card 05). Quem decide se pode é o ms (só o dono), pelo ator.
   */
  public async alterarReceberNovasVersoes(
    id: string,
    valor: boolean,
    ator: Ator,
  ) {
    return await this.axios.patch(
      `v1/prova/${encodeURIComponent(id)}/receber-novas-versoes`,
      { valor },
      headerDoAtor(ator),
    );
  }

  /**
   * Card 41 — edita os dados da prova do cursinho. Quem decide se pode (dono,
   * oficial, categoria) é o ms, pelo ator; 400/403/404/409 chegam com a
   * mensagem dele.
   */
  public async editarDados(
    id: string,
    dados: Record<string, unknown>,
    ator: Ator,
  ): Promise<{ nome: string }> {
    return await this.axios.patch(
      `v1/prova/${encodeURIComponent(id)}/dados`,
      dados,
      headerDoAtor(ator),
    );
  }

  /** Card 41 — exclusão lógica da prova do cursinho (o ms decide). */
  public async excluir(id: string, ator: Ator): Promise<{ nome: string }> {
    return await this.axios.delete(
      `v1/prova/${encodeURIComponent(id)}`,
      headerDoAtor(ator),
    );
  }

  /** As atualizações disponíveis das questões da prova (tickets/023, card 13). */
  public async listarAtualizacoes(id: string, ator: Ator) {
    return await this.axios.get(
      `v1/prova/${encodeURIComponent(id)}/atualizacoes`,
      headerDoAtor(ator),
    );
  }

  /**
   * Aplica versões novas na prova e nos simulados dela (tickets/023, card
   * 14). Quem só deixa o dono, e valida a cadeia, é o ms.
   */
  public async aplicarAtualizacoes(
    id: string,
    trocas: { de: string; para: string }[],
    ator: Ator,
  ) {
    return await this.axios.post(
      `v1/prova/${encodeURIComponent(id)}/atualizacoes`,
      { trocas: trocas.map(({ de, para }) => ({ de, para })) },
      headerDoAtor(ator),
    );
  }

  /**
   * Duplica a prova do cursinho (tickets/027, card 02): mesmas questões,
   * mesmos números, origem guardada. Quem decide se pode é o ms, pelo ator.
   */
  public async duplicar(id: string, nome: string, ator: Ator) {
    const copia = await this.axios.post<{ _id?: string }>(
      `v1/prova/${encodeURIComponent(id)}/duplicar`,
      { nome },
      headerDoAtor(ator),
    );
    const arquivos = await this.copiarArquivosDaProva(id, copia?._id);
    return arquivos ? { ...copia, ...arquivos } : copia;
  }

  /**
   * Card 37: a cópia nasce com o PDF e o gabarito da original — em arquivos
   * NOVOS no bucket. Compartilhar a mesma chave quebraria a original na
   * primeira troca de arquivo da cópia (`updateProvaFiles` apaga o antigo).
   *
   * Falhar aqui não desfaz a duplicação: a cópia fica sem arquivo, como as
   * provas de cursinho criadas sem PDF, e os detalhes mandam usar "Editar
   * arquivos".
   */
  private async copiarArquivosDaProva(
    origemId: string,
    copiaId?: string,
  ): Promise<{ filename?: string; gabarito?: string } | null> {
    if (!copiaId) return null;
    try {
      const origem = (await this.axios.get(
        `v1/prova/${encodeURIComponent(origemId)}`,
      )) as { filename?: string; gabarito?: string };
      const payload: { filename?: string; gabarito?: string } = {};
      if (origem?.filename) {
        payload.filename = await this.copiarArquivo(origem.filename);
      }
      if (origem?.gabarito) {
        payload.gabarito = await this.copiarArquivo(origem.gabarito);
      }
      if (!payload.filename && !payload.gabarito) return null;
      await this.axios.patch(
        `v1/prova/${encodeURIComponent(copiaId)}/files`,
        payload,
      );
      return payload;
    } catch (err) {
      this.logger.warn(
        `prova ${copiaId} duplicada de ${origemId} SEM os arquivos: ` +
          (err instanceof Error ? err.message : String(err)),
      );
      return null;
    }
  }

  private async copiarArquivo(chave: string): Promise<string> {
    const bucket = this.envService.get('BUCKET_SIMULADO');
    const { buffer, contentType } = await this.blobService.getFile(
      chave,
      bucket,
    );
    const extensao = chave.includes('.') ? chave.split('.').pop() : 'pdf';
    const nova = `${uuidv4()}.${extensao}`;
    await this.blobService.putObjectAtKey(
      Buffer.from(buffer, 'base64'),
      bucket,
      nova,
      contentType,
    );
    return nova;
  }

  public async createProva(
    prova: CreateProvaDTOInput,
    file: any,
    gabarito: any,
    criadorId: string,
    cursinhoId: string | null = null,
  ) {
    // Arquivos são opcionais (provas custom podem não ter PDF). Só sobe o que veio.
    let fileName: string | undefined;
    let gabaritoName: string | undefined;

    if (file) {
      fileName = await this.blobService.uploadFile(
        file,
        this.envService.get('BUCKET_SIMULADO'),
      );
      if (!fileName) {
        throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
      }
    }

    if (gabarito) {
      gabaritoName = await this.blobService.uploadFile(
        gabarito,
        this.envService.get('BUCKET_SIMULADO'),
      );
      if (!gabaritoName) {
        throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
      }
    }

    const request = new CreateProvaDTORequest();
    request.edicao = prova.edicao;
    request.ano = parseInt(prova.ano as unknown as string);
    request.aplicacao = parseInt(prova.aplicacao as unknown as string);
    request.categoria = prova.categoria;
    request.filename = fileName;
    request.gabarito = gabaritoName;
    request.nome = prova.nome;
    request.nomeSimulado = prova.nomeSimulado;
    // Injeção pelo backend: criadorId vem do JWT; cursinhoId é null no fluxo
    // admin e populado no fluxo cursinho (etapa 6). Ignora o que o cliente
    // eventualmente enviar.
    request.criadorId = criadorId;
    request.cursinhoId = cursinhoId;
    request.receberNovasVersoes =
      prova.receberNovasVersoes === true ||
      prova.receberNovasVersoes === 'true';
    return await this.axios.post(`v1/prova`, request);
  }

  /**
   * Com o ator: o ms devolve dono, proteção e `podeComporProva`; aqui entra o
   * nome do cursinho dono (tickets/023, card 07).
   */
  public async getProvaById(id: string, ator?: Ator) {
    const prova = await this.axios.get<any>(
      `v1/prova/${id}`,
      ator ? headerDoAtor(ator) : undefined,
    );
    if (prova?.cursinhoId && this.cursinhoNome) {
      return (await this.cursinhoNome.comNome([prova]))[0];
    }
    return prova;
  }

  /**
   * ⚠️ `page`/`limit` sao `string | undefined` de proposito, no MESMO molde do
   * `getAllByCursinho` logo abaixo. Eles vem crus do querystring; o
   * `if (page)` garante que o ausente fique **ausente** na URL, em vez de
   * virar a string "undefined" -- o ms leria isso como um limit invalido e
   * falharia em silencio.
   *
   * ⚠️ **Nao trocar por `@Query() query: GetAllDtoInput`.** MEDIDO: com
   * `transform: true`, o ValidationPipe instancia o DTO e os inicializadores
   * de classe entram sempre -- sem querystring o handler recebe
   * `{ page: 1, limit: 100 }`, nunca `undefined`. Isso (a) tornaria
   * impossivel repassar `v1/prova` cru e (b) trocaria o default efetivo de
   * 40 (do ms) por 100 (da api) para todo chamador que hoje chama sem
   * parametro. Ha teste para o caso "sem query" exatamente por isso.
   */
  public async getProvasAll(page?: string, limit?: string) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return await this.axios.get(`v1/prova${qs ? `?${qs}` : ''}`);
  }

  public async getAllByCursinho(
    cursinhoId: string,
    page?: string,
    limit?: string,
  ) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return await this.axios.get(
      `v1/prova/cursinho/${cursinhoId}${qs ? `?${qs}` : ''}`,
    );
  }

  public async getMissingNumbers(id: string) {
    return await this.axios.get(`v1/prova/missing/${id}`);
  }

  public async getSummary() {
    return this.cache.wrap<object>(
      'prova',
      async () => await this.axios.get<any>(`v1/prova/summary`),
    );
  }

  public async getFile(id: string) {
    return await this.blobService.getFile(
      `${id}`,
      this.envService.get('BUCKET_SIMULADO'),
    );
  }

  public async startSync() {
    return await this.axios.post('v1/prova/sync', {});
  }

  public async getSyncReport() {
    return await this.axios.get('v1/prova/sync/report');
  }

  public async updateProvaFiles(
    provaId: string,
    file?: Express.Multer.File,
    gabarito?: Express.Multer.File,
  ) {
    const bucket = 'BUCKET_SIMULADO';

    if (!file && !gabarito) {
      throw new HttpException(
        'Nenhum arquivo enviado para atualização',
        HttpStatus.BAD_REQUEST,
      );
    }

    const current = (await this.axios.get(`v1/prova/${provaId}`)) as {
      filename: string;
      gabarito: string;
    };

    let newFileName: string | undefined;
    let newGabaritoName: string | undefined;

    if (file) {
      newFileName = await this.blobService.uploadFile(
        file,
        this.envService.get(bucket),
      );
    }

    if (gabarito) {
      newGabaritoName = await this.blobService.uploadFile(
        gabarito,
        this.envService.get(bucket),
      );
    }

    const payload: any = {};
    if (newFileName) payload.filename = newFileName;
    if (newGabaritoName) payload.gabarito = newGabaritoName;

    try {
      const updated = await this.axios.patch(
        `v1/prova/${provaId}/files`,
        payload,
      );

      try {
        if (newFileName && current.filename) {
          await this.blobService.deleteFile(
            current.filename,
            this.envService.get(bucket),
          );
        }

        if (newGabaritoName && current.gabarito) {
          await this.blobService.deleteFile(
            current.gabarito,
            this.envService.get(bucket),
          );
        }
      } catch (err) {
        throw new HttpException(
          'Erro ao deletar arquivos antigos',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return updated;
    } catch (err) {
      if (newFileName) {
        await this.blobService.deleteFile(newFileName, bucket);
      }
      if (newGabaritoName) {
        await this.blobService.deleteFile(newGabaritoName, bucket);
      }

      throw new HttpException(
        'Erro ao atualizar arquivos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
