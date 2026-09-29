import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TipoDeLink } from './cursinho-link.entity';
import {
  CursinhoPaginaService,
  TEXTO_ATIVAR_SEM_QUEM_SOMOS,
} from './cursinho-pagina.service';

describe('CursinhoPaginaService (025 · 01)', () => {
  let service: CursinhoPaginaService;
  let repo: any;
  let colaboradores: any;
  let cache: any;
  let paginas: Record<string, any>;

  const colaboradorDo = (id: string, nome = 'Cursinho Popular São João') => ({
    actived: true,
    partnerPrepCourse: { id, geo: { name: nome } },
  });

  beforeEach(() => {
    paginas = {};
    repo = {
      findByCursinho: jest.fn(async (id) => paginas[id] ?? null),
      slugEmUso: jest.fn(async (slug, exceto) =>
        Object.values(paginas).some(
          (p: any) => p.slug === slug && p.id !== exceto,
        ),
      ),
      salvarComLinks: jest.fn(async (p, links) => {
        const id = p.id ?? `pg-${p.partnerPrepCourseId}`;
        paginas[p.partnerPrepCourseId] = { ...p, id, links };
      }),
    };
    colaboradores = {
      findOneByUserIdWithGeo: jest.fn(async () => colaboradorDo('A')),
    };
    cache = { del: jest.fn() };
    service = new CursinhoPaginaService(repo, colaboradores, cache);
  });

  const dto = (over = {}) => ({
    slug: 'meu-cursinho',
    quemSomos: 'Somos um cursinho popular.',
    active: true,
    linksPublicos: [{ titulo: 'Site', url: 'https://a.org' }],
    linksInternos: [{ titulo: 'Drive', url: 'https://drive' }],
    ...over,
  });

  it('1ª abertura cria desativada, com slug do nome', async () => {
    const r = await service.paraEdicao('u1');
    expect(r).toMatchObject({
      slug: 'cursinho-popular-sao-joao',
      active: false,
      quemSomos: null,
      nomeDoCursinho: 'Cursinho Popular São João',
      linksPublicos: [],
      linksInternos: [],
    });
  });

  it('slug do nome já usado por outro cursinho ganha -2', async () => {
    paginas.B = { id: 'pg-B', slug: 'cursinho-popular-sao-joao', links: [] };
    expect((await service.paraEdicao('u1')).slug).toBe(
      'cursinho-popular-sao-joao-2',
    );
  });

  it('⚠️ o cursinho vem do colaborador logado; sem colaborador ativo → 403', async () => {
    colaboradores.findOneByUserIdWithGeo.mockResolvedValue(null);
    await expect(service.paraEdicao('u1')).rejects.toThrow(ForbiddenException);
    colaboradores.findOneByUserIdWithGeo.mockResolvedValue({
      ...colaboradorDo('A'),
      actived: false,
    });
    await expect(service.paraEdicao('u1')).rejects.toThrow(ForbiddenException);
  });

  it('salva, separa os links por tipo e limpa o cache do slug antigo e do novo', async () => {
    await service.paraEdicao('u1');
    const r = await service.salvar('u1', dto());

    expect(r).toMatchObject({
      slug: 'meu-cursinho',
      active: true,
      linksPublicos: [{ titulo: 'Site', url: 'https://a.org' }],
      linksInternos: [{ titulo: 'Drive', url: 'https://drive' }],
    });
    const [, links] = repo.salvarComLinks.mock.calls.at(-1);
    expect(links.map((l) => l.tipo)).toEqual([
      TipoDeLink.Publico,
      TipoDeLink.Interno,
    ]);
    expect(cache.del).toHaveBeenCalledWith(
      'cursinho:pagina:cursinho-popular-sao-joao',
    );
    expect(cache.del).toHaveBeenCalledWith('cursinho:pagina:meu-cursinho');
  });

  it('ativar sem Quem somos → 400 e nada gravado', async () => {
    await service.paraEdicao('u1');
    repo.salvarComLinks.mockClear();
    for (const quemSomos of [null, '', '  ', '**\n**']) {
      await expect(service.salvar('u1', dto({ quemSomos }))).rejects.toThrow(
        TEXTO_ATIVAR_SEM_QUEM_SOMOS,
      );
    }
    expect(repo.salvarComLinks).not.toHaveBeenCalled();
  });

  it('desativada, pode salvar sem Quem somos', async () => {
    await service.paraEdicao('u1');
    const r = await service.salvar('u1', dto({ active: false, quemSomos: '' }));
    expect(r).toMatchObject({ active: false, quemSomos: null });
  });

  it('slug inválido → 400; ocupado por outro → 409; o próprio não conta', async () => {
    paginas.B = { id: 'pg-B', slug: 'ocupado', links: [] };
    await service.paraEdicao('u1');
    await expect(
      service.salvar('u1', dto({ slug: 'Com Espaço' })),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.salvar('u1', dto({ slug: 'ocupado' })),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.salvar('u1', dto({ slug: 'cursinho-popular-sao-joao' })),
    ).resolves.toBeDefined();
  });

  it('imagem no Quem somos → 400', async () => {
    await service.paraEdicao('u1');
    await expect(
      service.salvar('u1', dto({ quemSomos: 'oi ![x](asset://a.png)' })),
    ).rejects.toThrow('não aceita imagens');
  });
});
