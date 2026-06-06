import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupporterActiveFlag1780000000000 implements MigrationInterface {
  name = 'SupporterActiveFlag1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`home_supporter\` ADD \`active\` tinyint NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`home_supporter\` DROP COLUMN \`active\``,
    );
  }
}
