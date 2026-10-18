import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecalculoAnulacaoJob1792262744264 implements MigrationInterface {
  name = 'RecalculoAnulacaoJob1792262744264';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`recalculo_anulacao_job\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`job_id\` varchar(24) NOT NULL, \`prova_nome\` varchar(200) NOT NULL, \`afetados\` int NOT NULL DEFAULT '0', UNIQUE INDEX \`UQ_recalculo_anulacao_job\` (\`job_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`UQ_recalculo_anulacao_job\` ON \`recalculo_anulacao_job\``,
    );
    await queryRunner.query(`DROP TABLE \`recalculo_anulacao_job\``);
  }
}
