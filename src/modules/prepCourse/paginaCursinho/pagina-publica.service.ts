import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { CollaboratorService } from '../collaborator/collaborator.service';
import { TipoDeLink } from '../partnerPrepCourse/pagina/cursinho-link.entity';
import { CursinhoPaginaRepository } from '../partnerPrepCourse/pagina/cursinho-pagina.repository';
import { chaveDaPaginaPublica } from '../partnerPrepCourse/pagina/regras-da-pagina';
import {
  ImpactoDoCursinho,
  ImpactoDoCursinhoService,
} from './impacto-do-cursinho.service';

/** As redes que a página mostra, na ordem, vindas do `geo` (R: sem duplicar). */
export const REDES = [
  'site',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'twitter',
  'tiktok',
] as const;
export type Rede = (typeof REDES)[number];

export type PaginaPublica = {
  cursinhoId: string;
  slug: string;
  nome: string;
  localizacao: string;
  quemSomos: string;
  redes: { rede: Rede; url: string }[];
  linksPublicos: { titulo: string; url: string }[];
  colaboradores: { name: string; description: string; image: string }[];
  impacto: ImpactoDoCursinho;
};

/** Chaves que a resposta pública pode ter — o teste confere contra isto. */
export const CAMPOS_DA_PAGINA_PUBLICA: (keyof PaginaPublica)[] = [
  'cursinhoId',
  'slug',
  'nome',
  'localizacao',
  'quemSomos',
  'redes',
  'linksPublicos',
  'colaboradores',
  'impacto',
];

const CINCO_MINUTOS = 5 * 60 * 1000;
export const TEXTO_PAGINA_NAO_ENCONTRADA = 'Página não encontrada';

/**
 * `GET cursinho-pagina/:slug` (tickets/025, card 04). Pública e cacheável:
 * lista branca, e **nunca** os links internos (esses são o card 05).
 */
@Injectable()
export class PaginaPublicaService {
  constructor(
    private readonly paginas: CursinhoPaginaRepository,
    private readonly colaboradores: CollaboratorService,
    private readonly impacto: ImpactoDoCursinhoService,
    private readonly cache: CacheService,
  ) {}

  porSlug(slug: string): Promise<PaginaPublica> {
    // O 404 lança dentro do wrap: não entra no cache.
    return this.cache.wrap(
      chaveDaPaginaPublica(slug),
      () => this.montar(slug),
      CINCO_MINUTOS,
    );
  }

  private async montar(slug: string): Promise<PaginaPublica> {
    const pagina = await this.paginas.findBySlugComCursinho(slug);
    // Inexistente e desativada dão o MESMO 404: não revela que a página existe.
    if (!pagina?.active || !pagina.partnerPrepCourse) {
      throw new NotFoundException(TEXTO_PAGINA_NAO_ENCONTRADA);
    }
    const cursinho = pagina.partnerPrepCourse;
    const geo = cursinho.geo;
    const [colaboradores, impacto] = await Promise.all([
      this.colaboradores.getCollaboratorByPrepPartner(cursinho.id),
      this.impacto.numeros(cursinho.id),
    ]);
    return {
      cursinhoId: cursinho.id,
      slug: pagina.slug,
      nome: geo?.name ?? '',
      localizacao: [geo?.city, geo?.state].filter(Boolean).join(' - '),
      quemSomos: pagina.quemSomos ?? '',
      redes: REDES.filter((r) => geo?.[r]?.trim()).map((r) => ({
        rede: r,
        url: geo[r].trim(),
      })),
      linksPublicos: (pagina.links ?? [])
        .filter((l) => l.tipo === TipoDeLink.Publico)
        .map(({ titulo, url }) => ({ titulo, url })),
      // Só os ativos, e só nome/descrição/foto (o que a "Quem Somos" já mostra).
      colaboradores: colaboradores
        .filter((c) => c.actived !== false)
        .map(({ name, description, image }) => ({ name, description, image })),
      impacto,
    };
  }
}
