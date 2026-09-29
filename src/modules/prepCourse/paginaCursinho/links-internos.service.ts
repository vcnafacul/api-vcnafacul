import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { TipoDeLink } from '../partnerPrepCourse/pagina/cursinho-link.entity';
import { CursinhoPaginaRepository } from '../partnerPrepCourse/pagina/cursinho-pagina.repository';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { TEXTO_PAGINA_NAO_ENCONTRADA } from './pagina-publica.service';

export const TEXTO_SEM_VINCULO =
  'Estes links são só para colaboradores e alunos deste cursinho.';

/**
 * Links internos da página (tickets/025, card 05, R5): logado **e** com
 * vínculo com AQUELE cursinho — colaborador ativo ou aluno matriculado.
 * Cargo não conta: admin da plataforma sem vínculo também recebe 403.
 */
@Injectable()
export class LinksInternosService {
  constructor(
    private readonly paginas: CursinhoPaginaRepository,
    private readonly colaboradores: CollaboratorRepository,
    private readonly alunos: StudentCourseRepository,
  ) {}

  async doSlug(
    slug: string,
    userId: string,
  ): Promise<{ titulo: string; url: string }[]> {
    const pagina = await this.paginas.findBySlug(slug);
    if (!pagina?.active) {
      throw new NotFoundException(TEXTO_PAGINA_NAO_ENCONTRADA);
    }
    const cursinhoId = pagina.partnerPrepCourseId;
    const [colaborador, aluno] = await Promise.all([
      this.colaboradores.ehColaboradorAtivoDo(userId, cursinhoId),
      this.alunos.ehAlunoMatriculadoNo(userId, cursinhoId),
    ]);
    if (!colaborador && !aluno) throw new ForbiddenException(TEXTO_SEM_VINCULO);
    return (pagina.links ?? [])
      .filter((l) => l.tipo === TipoDeLink.Interno)
      .map(({ titulo, url }) => ({ titulo, url }));
  }
}
