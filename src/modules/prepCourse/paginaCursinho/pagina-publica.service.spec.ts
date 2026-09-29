import { NotFoundException } from '@nestjs/common';
import { TipoDeLink } from '../partnerPrepCourse/pagina/cursinho-link.entity';
import {
  CAMPOS_DA_PAGINA_PUBLICA,
  PaginaPublicaService,
} from './pagina-publica.service';

describe('PaginaPublicaService (025 · 04)', () => {
  const impactoFixo = {
    estudantesAtendidos: 1,
    estudantesAtivos: 1,
    questoesAprovadas: 1,
    processosSeletivos: 1,
  };

  const pagina = (over = {}) => ({
    slug: 'meu',
    active: true,
    quemSomos: 'Somos',
    links: [
      { tipo: TipoDeLink.Publico, titulo: 'Site', url: 'https://a', ordem: 0 },
      {
        tipo: TipoDeLink.Interno,
        titulo: 'Drive',
        url: 'https://drive',
        ordem: 1,
      },
    ],
    partnerPrepCourse: {
      id: 'A',
      representative: { email: 'rep@x' },
      geo: {
        name: 'Cursinho A',
        city: 'São Paulo',
        state: 'SP',
        instagram: 'https://instagram.com/a',
        facebook: '   ',
        tiktok: null,
        email: 'contato@a',
        phone: '11999',
        userEmail: 'quem-cadastrou@x',
      },
    },
    ...over,
  });

  const montar = (p: unknown) => {
    const paginas = { findBySlugComCursinho: jest.fn().mockResolvedValue(p) };
    const colaboradores = {
      getCollaboratorByPrepPartner: jest.fn().mockResolvedValue([
        { name: 'Ana', description: 'Coord.', image: 'k1', actived: true },
        { name: 'Beto', description: 'Ex', image: null, actived: false },
      ]),
    };
    const impacto = { numeros: jest.fn().mockResolvedValue(impactoFixo) };
    const cache = { wrap: jest.fn((_k, fn) => fn()) };
    const service = new PaginaPublicaService(
      paginas as never,
      colaboradores as never,
      impacto as never,
      cache as never,
    );
    return { service, cache };
  };

  it('monta a página só com a lista branca', async () => {
    const { service, cache } = montar(pagina());
    const r = await service.porSlug('meu');

    expect(Object.keys(r).sort()).toEqual([...CAMPOS_DA_PAGINA_PUBLICA].sort());
    expect(r).toEqual({
      cursinhoId: 'A',
      slug: 'meu',
      nome: 'Cursinho A',
      localizacao: 'São Paulo - SP',
      quemSomos: 'Somos',
      redes: [{ rede: 'instagram', url: 'https://instagram.com/a' }],
      linksPublicos: [{ titulo: 'Site', url: 'https://a' }],
      colaboradores: [{ name: 'Ana', description: 'Coord.', image: 'k1' }],
      impacto: impactoFixo,
    });
    expect(cache.wrap.mock.calls[0][0]).toBe('cursinho:pagina:meu');
  });

  it('⚠️ nunca leva links internos nem PII', async () => {
    const { service } = montar(pagina());
    const json = JSON.stringify(await service.porSlug('meu'));
    for (const proibido of [
      'drive',
      'rep@x',
      'contato@a',
      '11999',
      'quem-cadastrou',
    ]) {
      expect(json).not.toContain(proibido);
    }
  });

  it('desativada e inexistente dão o mesmo 404', async () => {
    for (const p of [null, pagina({ active: false })]) {
      const { service } = montar(p);
      await expect(service.porSlug('meu')).rejects.toThrow(NotFoundException);
    }
  });
});
