import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushRecalculoAnulacao1792263330880 implements MigrationInterface {
  name = 'PushRecalculoAnulacao1792263330880';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`push_recalculo_anulacao\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`job_id\` varchar(24) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`historico_id\` varchar(24) NOT NULL, \`recorte\` varchar(200) NOT NULL, \`prova_nome\` varchar(200) NOT NULL, \`quantas_anuladas\` int NOT NULL DEFAULT '1', \`status\` varchar(10) NOT NULL DEFAULT 'pendente', \`envios\` int NOT NULL DEFAULT '0', \`tentativas\` int NOT NULL DEFAULT '0', \`proxima_tentativa_em\` datetime(3) NOT NULL, INDEX \`IDX_push_recalculo_recorte_usuario\` (\`recorte\`, \`user_id\`, \`created_at\`), UNIQUE INDEX \`UQ_push_recalculo_job_usuario\` (\`job_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`UQ_push_recalculo_job_usuario\` ON \`push_recalculo_anulacao\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_push_recalculo_recorte_usuario\` ON \`push_recalculo_anulacao\``,
    );
    await queryRunner.query(`DROP TABLE \`push_recalculo_anulacao\``);
  }
}
