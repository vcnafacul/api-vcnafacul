import { StatusApplication } from 'src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { separarInscricoes } from './resumo-do-usuario.regras';

const inscricao = (status: string) => ({
  cursinho: { id: 'c1', nome: 'Cursinho' },
  processo: { id: 'p1', nome: 'Processo 2026' },
  status,
  turma: null,
  em: new Date(),
});

describe('separarInscricoes (usuários 04)', () => {
  it('⚠️ Matriculado é o atual', () => {
    const { atual, historico } = separarInscricoes([
      inscricao(StatusApplication.Enrolled),
    ]);

    expect(atual).toHaveLength(1);
    expect(historico).toHaveLength(0);
  });

  it('⚠️ TODO o resto é histórico — inclusive o que ainda está em andamento', () => {
    const outros = Object.values(StatusApplication).filter(
      (s) => s !== StatusApplication.Enrolled,
    );

    const { atual, historico } = separarInscricoes(outros.map(inscricao));

    expect(atual).toHaveLength(0);
    expect(historico.map((i) => i.status)).toEqual(outros);
  });

  it('mantém a ordem de chegada', () => {
    const { historico } = separarInscricoes([
      inscricao(StatusApplication.Rejected),
      inscricao(StatusApplication.EnrollmentClosed),
    ]);

    expect(historico.map((i) => i.status)).toEqual([
      StatusApplication.Rejected,
      StatusApplication.EnrollmentClosed,
    ]);
  });
});
