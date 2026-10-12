import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventoPorSimulado1791836237923 implements MigrationInterface {
  name = 'EventoPorSimulado1791836237923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`simulado_evento_inscricao\` ADD \`simulado_id\` varchar(24) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`simulado_evento_prova\` ADD \`simulados\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`simulado_evento_prova\` DROP COLUMN \`simulados\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`simulado_evento_inscricao\` DROP COLUMN \`simulado_id\``,
    );
  }
}
