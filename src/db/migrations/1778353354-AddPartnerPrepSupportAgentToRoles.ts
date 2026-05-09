import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerPrepSupportAgentToRoles1778353354
  implements MigrationInterface
{
  name = 'AddPartnerPrepSupportAgentToRoles1778353354';

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
