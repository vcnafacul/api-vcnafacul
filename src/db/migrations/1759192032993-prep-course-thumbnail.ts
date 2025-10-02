import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepCourseThumbnail1759192032993 implements MigrationInterface {
  name = 'PrepCourseThumbnail1759192032993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`thumbnail\` blob NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`thumbnail\``,
    );
  }
}
