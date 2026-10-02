import { MigrationInterface, QueryRunner } from 'typeorm';

export class CentralDeNotificacoes1790904972597 implements MigrationInterface {
  name = 'CentralDeNotificacoes1790904972597';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notificacao_do_usuario\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`titulo\` varchar(100) NOT NULL, \`corpo\` varchar(500) NOT NULL, \`url\` varchar(512) NULL, \`push_notification_id\` varchar(255) NULL, \`lida_em\` timestamp NULL, INDEX \`IDX_notificacao_do_usuario_leitura\` (\`user_id\`, \`lida_em\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notificacao_do_usuario\` ADD CONSTRAINT \`FK_892fa4c42c5e354176fd3b3e748\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notificacao_do_usuario\` ADD CONSTRAINT \`FK_9a59ca7746965a62583e74f4c6a\` FOREIGN KEY (\`push_notification_id\`) REFERENCES \`push_notification\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notificacao_do_usuario\` DROP FOREIGN KEY \`FK_9a59ca7746965a62583e74f4c6a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`notificacao_do_usuario\` DROP FOREIGN KEY \`FK_892fa4c42c5e354176fd3b3e748\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_notificacao_do_usuario_leitura\` ON \`notificacao_do_usuario\``,
    );
    await queryRunner.query(`DROP TABLE \`notificacao_do_usuario\``);
  }
}
