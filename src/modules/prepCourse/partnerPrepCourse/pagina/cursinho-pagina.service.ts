import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { TipoDeLink } from './cursinho-link.entity';
import { CursinhoPagina } from './cursinho-pagina.entity';
import { CursinhoPaginaRepository } from './cursinho-pagina.repository';
import { SalvarPaginaDtoInput } from './dtos/salvar-pagina.dto';
import {
  chaveDaPaginaPublica,
  gerarSlug,
  primeiroSlugLivre,
  quemSomosVazio,
  slugValido,
  temImagem,
} from './regras-da-pagina';

export type LinkDaPagina = { titulo: string; url: string };

export type PaginaParaEdicao = {
  slug: string;
  quemSomos: string | null;
  active: boolean;
  nomeDoCursinho: string;
  linksPublicos: LinkDaPagina[];
  linksInternos: LinkDaPagina[];
};

export const TEXTO_SLUG_INVALIDO =
  'Endereço inválido: use de 3 a 60 letras minúsculas, números e hífen (sem acentos nem espaços).';
export const TEXTO_SLUG_EM_USO =
  'Este endereço já está em uso por outro cursinho.';
export const TEXTO_SEM_IMAGEM = 'O texto do Quem somos não aceita imagens.';
export const TEXTO_ATIVAR_SEM_QUEM_SOMOS =
  'Para ativar a página, preencha o Quem somos.';

const soLinks = (
  links: { tipo: TipoDeLink; titulo: string; url: string }[],
  tipo: TipoDeLink,
) =>
  (links ?? [])
    .filter((l) => l.tipo === tipo)
    .map(({ titulo, url }) => ({ titulo, url }));

/**
 * A página do cursinho do usuário logado (tickets/025, card 01).
 *
 * ⚠️ O cursinho sai SEMPRE do colaborador logado — nunca do corpo nem da URL.
 */
@Injectable()
export class CursinhoPaginaService {
  constructor(
    private readonly repository: CursinhoPaginaRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly cache: CacheService,
  ) {}

  private async cursinhoDoUsuario(userId: string) {
    const colaborador =
      await this.collaboratorRepository.findOneByUserIdWithGeo(userId);
    if (!colaborador?.partnerPrepCourse || colaborador.actived === false) {
      throw new ForbiddenException(
        'Só colaboradores ativos de um cursinho editam a página dele.',
      );
    }
    return colaborador.partnerPrepCourse;
  }

  /** A página do cursinho; a primeira abertura cria, desativada (R1, R3). */
  async paraEdicao(userId: string): Promise<PaginaParaEdicao> {
    const cursinho = await this.cursinhoDoUsuario(userId);
    let pagina = await this.repository.findByCursinho(cursinho.id);
    if (!pagina) {
      const slug = await primeiroSlugLivre(gerarSlug(cursinho.geo?.name), (s) =>
        this.repository.slugEmUso(s),
      );
      await this.repository.salvarComLinks(
        {
          partnerPrepCourseId: cursinho.id,
          slug,
          quemSomos: null,
          active: false,
        } as CursinhoPagina,
        [],
      );
      pagina = await this.repository.findByCursinho(cursinho.id);
    }
    return {
      slug: pagina.slug,
      quemSomos: pagina.quemSomos,
      active: pagina.active,
      nomeDoCursinho: cursinho.geo?.name ?? '',
      linksPublicos: soLinks(pagina.links, TipoDeLink.Publico),
      linksInternos: soLinks(pagina.links, TipoDeLink.Interno),
    };
  }

  /** Valida TUDO antes de gravar; o PUT substitui as duas listas de links. */
  async salvar(
    userId: string,
    dto: SalvarPaginaDtoInput,
  ): Promise<PaginaParaEdicao> {
    const atual = await this.paraEdicao(userId);
    const cursinho = await this.cursinhoDoUsuario(userId);
    const pagina = await this.repository.findByCursinho(cursinho.id);

    if (!slugValido(dto.slug))
      throw new BadRequestException(TEXTO_SLUG_INVALIDO);
    if (await this.repository.slugEmUso(dto.slug, pagina.id)) {
      throw new ConflictException(TEXTO_SLUG_EM_USO);
    }
    const quemSomos = dto.quemSomos?.trim() ? dto.quemSomos : null;
    if (temImagem(quemSomos)) throw new BadRequestException(TEXTO_SEM_IMAGEM);
    if (dto.active && quemSomosVazio(quemSomos)) {
      throw new BadRequestException(TEXTO_ATIVAR_SEM_QUEM_SOMOS);
    }

    await this.repository.salvarComLinks(
      {
        id: pagina.id,
        partnerPrepCourseId: cursinho.id,
        slug: dto.slug,
        quemSomos,
        active: dto.active,
      } as CursinhoPagina,
      [
        ...dto.linksPublicos.map((l) => ({ ...l, tipo: TipoDeLink.Publico })),
        ...dto.linksInternos.map((l) => ({ ...l, tipo: TipoDeLink.Interno })),
      ],
    );
    // O slug antigo some e o novo passa a responder: os dois saem do cache.
    await this.cache.del(chaveDaPaginaPublica(atual.slug));
    await this.cache.del(chaveDaPaginaPublica(dto.slug));
    return this.paraEdicao(userId);
  }
}
