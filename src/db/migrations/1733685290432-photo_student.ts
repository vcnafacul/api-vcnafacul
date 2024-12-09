import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhotoStudent1733685290432 implements MigrationInterface {
  name = 'PhotoStudent1733685290432';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`photo\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`photo\``,
    );
  }
}
