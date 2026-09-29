import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EssayThemeRepository } from './essay-theme.repository';
import { CreateEssayThemeDto } from './dtos/create-essay-theme.dto';
import { UpdateEssayThemeDto } from './dtos/update-essay-theme.dto';
import { EssayTheme } from './entities/essay-theme.entity';
import { CacheService } from '../../shared/modules/cache/cache.service';
import { BlobService } from '../../shared/services/blob/blob-service';
import { EnvService } from '../../shared/modules/env/env.service';
import { parseAssetIds } from '../news/utils/parse-asset-ids';
import { ImagemParaIA } from './ai/essay-ai.interface';
import {
  ASSET_ID_VALIDO,
  EXTENSAO_POR_TIPO,
  PREFIXO_DO_TEMA,
  TAMANHO_MAXIMO,
  chaveNoBucket,
  textoMotivadorParaIA,
} from './theme-assets';

@Injectable()
export class EssayThemeService {
  private readonly CURRENT_THEME_CACHE_KEY = 'essay:theme:current';
  private readonly logger = new Logger(EssayThemeService.name);

  constructor(
    private readonly themeRepo: EssayThemeRepository,
    private readonly cache: CacheService,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly envService: EnvService,
  ) {}

  async create(dto: CreateEssayThemeDto, userId: string): Promise<EssayTheme> {
    const result = await this.themeRepo.create({
      ...dto,
      createdBy: userId,
    } as unknown as EssayTheme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);
    return result;
  }

  async findCurrent(): Promise<EssayTheme | null> {
    return this.cache.wrap(
      this.CURRENT_THEME_CACHE_KEY,
      () => this.themeRepo.findCurrentTheme(),
      60 * 60 * 1000, // 1h
    );
  }

  async findAvailable(userId: string): Promise<EssayTheme[]> {
    return this.themeRepo.findAvailableForUser(userId);
  }

  async findAll(page = 1, limit = 10) {
    return this.themeRepo.findAllBy({ page, limit });
  }

  async findById(id: string): Promise<EssayTheme> {
    const theme = await this.themeRepo.findOneBy({ id });
    if (!theme) throw new NotFoundException('Tema nao encontrado');
    return theme;
  }

  async update(id: string, dto: UpdateEssayThemeDto): Promise<void> {
    const theme = await this.findById(id);
    const imagensAntes = parseAssetIds(theme.motivationalText);
    Object.assign(theme, dto);
    await this.themeRepo.update(theme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);

    // Só depois de salvo: se o save falhar, o texto antigo ainda aponta
    // para as imagens.
    if (dto.motivationalText !== undefined) {
      const agora = parseAssetIds(dto.motivationalText);
      await this.apagarImagens(imagensAntes.filter((i) => !agora.includes(i)));
    }
  }

  // ---- Imagens do texto motivador ----

  async uploadAsset(file: Express.Multer.File): Promise<{ assetId: string }> {
    if (!file) throw new BadRequestException('Arquivo é obrigatório');
    const ext = EXTENSAO_POR_TIPO[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Formato não aceito. Envie JPG, PNG, WEBP ou GIF.',
      );
    }
    if (file.size > TAMANHO_MAXIMO) {
      throw new BadRequestException('A imagem deve ter no máximo 5MB');
    }
    // ⚠️ A extensão sai do tipo, não do nome enviado: o id tem de caber no
    // `asset://` (sem espaço, sem barra).
    const key = await this.blobService.uploadFile(
      { ...file, originalname: `imagem.${ext}` },
      this.envService.get('BUCKET_ESSAY'),
      undefined,
      PREFIXO_DO_TEMA,
    );
    return { assetId: key.slice(PREFIXO_DO_TEMA.length + 1) };
  }

  async getAsset(
    assetId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!ASSET_ID_VALIDO.test(assetId)) {
      throw new NotFoundException('Imagem não encontrada');
    }
    const file = await this.blobService.getFile(
      chaveNoBucket(assetId),
      this.envService.get('BUCKET_ESSAY'),
    );
    return {
      buffer: Buffer.from(file.buffer, 'base64'),
      contentType: file.contentType,
    };
  }

  /**
   * O texto motivador com as imagens trocadas por `[Imagem N]` e as imagens
   * na mesma ordem, prontas para a IA. Imagem que não carrega fica de fora
   * (o marcador continua no texto): a correção não pode cair por causa dela.
   */
  async textoMotivadorComImagens(
    markdown: string,
  ): Promise<{ texto: string; imagens: ImagemParaIA[] }> {
    const { texto, assetIds } = textoMotivadorParaIA(markdown);
    const imagens: ImagemParaIA[] = [];
    for (const [i, assetId] of assetIds.entries()) {
      try {
        const file = await this.blobService.getFile(
          chaveNoBucket(assetId),
          this.envService.get('BUCKET_ESSAY'),
        );
        imagens.push({
          rotulo: `Imagem ${i + 1}`,
          mediaType: file.contentType,
          base64: file.buffer,
        });
      } catch (err) {
        this.logger.warn(`Imagem ${assetId} do tema não carregou: ${err}`);
      }
    }
    return { texto, imagens };
  }

  private async apagarImagens(assetIds: string[]): Promise<void> {
    for (const assetId of assetIds) {
      try {
        await this.blobService.deleteFile(
          chaveNoBucket(assetId),
          this.envService.get('BUCKET_ESSAY'),
        );
      } catch {
        // best-effort, como nas Novidades
      }
    }
  }

  async remove(id: string): Promise<void> {
    const theme = await this.findById(id);
    theme.active = false;
    await this.themeRepo.update(theme);
    await this.cache.del(this.CURRENT_THEME_CACHE_KEY);
  }
}
