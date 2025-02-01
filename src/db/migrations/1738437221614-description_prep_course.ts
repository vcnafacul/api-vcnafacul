import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescriptionPrepCourse1738437221614 implements MigrationInterface {
  name = 'DescriptionPrepCourse1738437221614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`description\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`description\` varchar(255) NULL`,
    );
  }
}
