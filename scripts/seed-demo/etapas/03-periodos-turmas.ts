import { Class } from '../../../src/modules/prepCourse/class/class.entity';
import { Collaborator } from '../../../src/modules/prepCourse/collaborator/collaborator.entity';
import { CoursePeriod } from '../../../src/modules/prepCourse/coursePeriod/course-period.entity';
import { PartnerPrepCourse } from '../../../src/modules/prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { ANOS, datasDoAno, TURMAS } from '../config';
import { Contexto } from '../contexto';

export async function executar(ctx: Contexto) {
  const professores = ctx.colaboradores.filter((c) =>
    c.papel.startsWith('Professor'),
  );
  const cursinho = { id: ctx.cursinhoId } as PartnerPrepCourse;
  for (const ano of ANOS) {
    const d = datasDoAno(ano);
    const periodo = await ctx.ds.getRepository(CoursePeriod).save(
      Object.assign(new CoursePeriod(), {
        name: `Ano letivo ${ano}`,
        year: ano,
        startDate: d.periodoInicio,
        endDate: d.periodoFim,
        partnerPrepCourse: cursinho,
      }),
    );
    ctx.periodos[ano] = periodo.id;

    for (const [i, t] of TURMAS.entries()) {
      const professor = professores[i % professores.length];
      const turma = await ctx.ds.getRepository(Class).save(
        Object.assign(new Class(), {
          name: `${t.nome} ${ano}`,
          description: `${t.nome} — preparatório ENEM ${ano}`,
          partnerPrepCourse: cursinho,
          coursePeriod: periodo,
          admins: [{ id: professor.id } as Collaborator],
        }),
      );
      ctx.turmas.push({
        id: turma.id,
        ano,
        nome: turma.name,
        professorId: professor.id,
      });
    }
  }
  console.log(
    `03 períodos/turmas: ${ANOS.length} períodos, ${ctx.turmas.length} turmas`,
  );
}
