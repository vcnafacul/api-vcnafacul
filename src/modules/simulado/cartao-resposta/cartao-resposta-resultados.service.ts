import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { HistoricoService } from '../historico/historico.service';

@Injectable()
export class CartaoRespostaResultadosService {
  constructor(
    private readonly cursinhoResolver: CursinhoResolverService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly historicoService: HistoricoService,
  ) {}

  async buscarPorMatricula(colaboradorUserId: string, matricula: string) {
    const prepCourseId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    const student =
      await this.studentCourseRepository.findByEnrollmentCodeAndPrepCourse(
        matricula,
        prepCourseId,
      );
    if (!student) {
      throw new NotFoundException('estudante não encontrado nesse cursinho');
    }

    const resultado = await this.historicoService.getAllByUser(
      { limit: 10 } as any,
      student.user.id,
    );

    const u = student.user;
    const nome =
      u.useSocialName && u.socialName
        ? u.socialName
        : `${u.firstName} ${u.lastName}`;

    return {
      estudante: {
        userId: student.user.id,
        nome,
        matricula: student.cod_enrolled,
      },
      historicos: (resultado as { data?: unknown[] })?.data ?? [],
    };
  }
}
