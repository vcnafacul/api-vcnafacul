import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Collaborator } from 'src/modules/prepCourse/collaborator/collaborator.entity';
import { StudentCourse } from 'src/modules/prepCourse/studentCourse/student-course.entity';
import { DataSource } from 'typeorm';
import { User } from '../user.entity';
import { ResumoDoUsuarioDtoOutput } from './resumo-do-usuario.output.dto';
import { separarInscricoes } from './resumo-do-usuario.regras';

/**
 * O resumo de um usuário (card 04 de `tela-de-usuarios`).
 *
 * ⚠️ **Três consultas, sempre — nunca N+1.** Conta (com a função), colaborador
 * (com o cursinho) e as inscrições (com cursinho, processo e turma num JOIN só).
 * Um estudante com dez inscrições custa o mesmo que um com uma.
 *
 * ⚠️ Pelo `DataSource`, e não pelos repositórios de colaborador e estudante:
 * o módulo de usuário não importa os módulos de cursinho (eles é que importam
 * o de usuário), e importar ao contrário faria um ciclo.
 */
@Injectable()
export class ResumoDoUsuarioService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resumo(userId: string): Promise<ResumoDoUsuarioDtoOutput> {
    const [usuario, colaborador, inscricoes] = await Promise.all([
      this.dataSource.getRepository(User).findOne({
        where: { id: userId },
        relations: ['role'],
      }),
      this.dataSource
        .getRepository(Collaborator)
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.partnerPrepCourse', 'p')
        .leftJoinAndSelect('p.geo', 'g')
        .where('c.user_id = :userId', { userId })
        .getOne(),
      this.dataSource
        .getRepository(StudentCourse)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.partnerPrepCourse', 'p')
        .leftJoinAndSelect('p.geo', 'g')
        .leftJoinAndSelect('s.inscriptionCourse', 'i')
        .leftJoinAndSelect('s.class', 't')
        .where('s.user_id = :userId', { userId })
        .orderBy('s.createdAt', 'DESC')
        .getMany(),
    ]);
    if (!usuario) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const cursinho = (p?: { id: string; geo?: { name: string } } | null) =>
      p ? { id: p.id, nome: p.geo?.name ?? '' } : null;

    return {
      conta: {
        id: usuario.id,
        nome: `${usuario.firstName} ${usuario.lastName}`.trim(),
        nomeSocial: usuario.socialName ?? null,
        usaNomeSocial: !!usuario.useSocialName,
        email: usuario.email,
        telefone: usuario.phone,
        cidade: usuario.city,
        uf: usuario.state,
        cadastradoEm: usuario.createdAt,
        ultimoAcesso: usuario.lastAccess ?? null,
        emailConfirmado: usuario.emailConfirmSended == null,
        desativada: usuario.deletedAt != null,
        funcao: usuario.role
          ? { id: usuario.role.id, nome: usuario.role.name }
          : null,
      },
      colaborador: colaborador
        ? {
            cursinho: cursinho(colaborador.partnerPrepCourse),
            ativo: colaborador.actived,
            desde: colaborador.createdAt,
          }
        : null,
      estudante: separarInscricoes(
        inscricoes.map((s) => ({
          cursinho: cursinho(s.partnerPrepCourse),
          processo: s.inscriptionCourse
            ? { id: s.inscriptionCourse.id, nome: s.inscriptionCourse.name }
            : null,
          status: s.applicationStatus,
          turma: s.class?.name ?? null,
          em: s.createdAt,
        })),
      ),
    };
  }
}
