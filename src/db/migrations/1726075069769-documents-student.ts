import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsStudent1726075069769 implements MigrationInterface {
  name = 'DocumentsStudent1726075069769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`documents\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`documents\``,
    );
  }
}
