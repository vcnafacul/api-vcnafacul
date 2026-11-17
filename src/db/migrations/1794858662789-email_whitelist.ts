import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailWhitelist1794858662789 implements MigrationInterface {
  name = 'EmailWhitelist1794858662789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`email_whitelist\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`note\` varchar(255) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_d14e1c8591f7b0869c28c84a05\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_d14e1c8591f7b0869c28c84a05\` ON \`email_whitelist\``,
    );
    await queryRunner.query(`DROP TABLE \`email_whitelist\``);
  }
}
