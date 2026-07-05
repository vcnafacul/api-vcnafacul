import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveVisualizarProvasFromCriarSimulado1783225907857
  implements MigrationInterface
{
  name = 'PreserveVisualizarProvasFromCriarSimulado1783225907857';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`roles\`
       SET \`visualizar_provas\` = 1
       WHERE \`criar_simulado\` = 1
         AND \`visualizar_provas\` = 0`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty — rollback not safe nor required
  }
}
