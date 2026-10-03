import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndicadorDiarioTurma1791055155723 implements MigrationInterface {
  name = 'IndicadorDiarioTurma1791055155723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`indicador_diario_turma\` (\`id\` varchar(36) NOT NULL, \`dia\` date NOT NULL, \`partner_prep_course_id\` varchar(36) NOT NULL, \`course_period_id\` varchar(36) NOT NULL, \`class_id\` varchar(36) NOT NULL, \`metricas\` json NOT NULL, \`versao\` int NOT NULL DEFAULT '1', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_indicador_diario_turma_periodo_dia\` (\`partner_prep_course_id\`, \`course_period_id\`, \`dia\`), UNIQUE INDEX \`UQ_indicador_diario_turma_dia\` (\`class_id\`, \`dia\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`UQ_indicador_diario_turma_dia\` ON \`indicador_diario_turma\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_indicador_diario_turma_periodo_dia\` ON \`indicador_diario_turma\``,
    );
    await queryRunner.query(`DROP TABLE \`indicador_diario_turma\``);
  }
}
