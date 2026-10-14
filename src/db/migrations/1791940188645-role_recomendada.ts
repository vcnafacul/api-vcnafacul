import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleRecomendada1791940188645 implements MigrationInterface {
  name = 'RoleRecomendada1791940188645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`is_recommended\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`is_recommended\``,
    );
  }
}
