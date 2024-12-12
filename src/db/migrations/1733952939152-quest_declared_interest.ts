import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuestDeclaredInterest1733952939152 implements MigrationInterface {
  name = 'QuestDeclaredInterest1733952939152';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`areaInterest\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`selectedCourses\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`selectedCourses\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`areaInterest\``,
    );
  }
}
