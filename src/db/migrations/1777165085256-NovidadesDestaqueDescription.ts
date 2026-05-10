import { MigrationInterface, QueryRunner } from 'typeorm';

export class NovidadesDestaqueDescription1777165085256
  implements MigrationInterface
{
  name = 'NovidadesDestaqueDescription1777165085256';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`session\``);
    await queryRunner.query(
      `ALTER TABLE \`news\` ADD \`description\` varchar(280) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`news\` ADD \`destaque\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`destaque\``);
    await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`description\``);
    await queryRunner.query(
      `ALTER TABLE \`news\` ADD \`session\` varchar(255) NOT NULL DEFAULT ''`,
    );
  }
}
