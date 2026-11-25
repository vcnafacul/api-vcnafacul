import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailWhitelistValidade1795648912573 implements MigrationInterface {
  name = 'EmailWhitelistValidade1795648912573';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Gerado pelo TypeORM como `ADD expired_at timestamp NOT NULL`; quebrado em
    // três passos para preencher quem já está na tabela (cadastro + 30 dias).
    await queryRunner.query(
      `ALTER TABLE \`email_whitelist\` ADD \`expired_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_whitelist\` ADD \`is_actived\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `UPDATE \`email_whitelist\` SET \`expired_at\` = DATE_ADD(\`created_at\`, INTERVAL 30 DAY), \`is_actived\` = (DATE_ADD(\`created_at\`, INTERVAL 30 DAY) > NOW())`,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_whitelist\` MODIFY \`expired_at\` timestamp NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`email_whitelist\` DROP COLUMN \`is_actived\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`email_whitelist\` DROP COLUMN \`expired_at\``,
    );
  }
}
