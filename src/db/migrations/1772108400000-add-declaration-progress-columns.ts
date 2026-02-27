import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeclarationProgressColumns1772108400000
  implements MigrationInterface
{
  name = 'AddDeclarationProgressColumns1772108400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`documents_done\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`photo_done\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`survey_done\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`survey_done\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`photo_done\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`documents_done\``,
    );
  }
}
