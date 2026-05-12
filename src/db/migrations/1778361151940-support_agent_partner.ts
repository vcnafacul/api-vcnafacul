import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportAgentPartner1778361151940 implements MigrationInterface {
  name = 'SupportAgentPartner1778361151940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`partner_prep_support_agent\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`partner_prep_support_agent\``,
    );
  }
}
