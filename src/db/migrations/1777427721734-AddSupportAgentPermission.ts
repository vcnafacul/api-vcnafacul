import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportAgentPermission1777427721734
  implements MigrationInterface
{
  name = 'AddSupportAgentPermission1777427721734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`support_agent\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`support_agent\``,
    );
  }
}
