import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseSocialName1742853304136 implements MigrationInterface {
  name = 'UseSocialName1742853304136';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`useSocialName\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`useSocialName\``,
    );
  }
}
