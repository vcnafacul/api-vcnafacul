import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogPartner1765332593225 implements MigrationInterface {
  name = 'LogPartner1765332593225';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`log_partner\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`partner_id\` varchar(255) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_partner\` ADD CONSTRAINT \`FK_90d5cae93e53f283f58ceb9b29c\` FOREIGN KEY (\`partner_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`log_partner\` DROP FOREIGN KEY \`FK_90d5cae93e53f283f58ceb9b29c\``,
    );
    await queryRunner.query(`DROP TABLE \`log_partner\``);
  }
}
