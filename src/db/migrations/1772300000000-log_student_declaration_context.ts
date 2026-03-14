import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogStudentDeclarationContext1772300000000
  implements MigrationInterface
{
  name = 'LogStudentDeclarationContext1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD \`user_agent\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD \`browser\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD \`os\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD \`device\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` ADD \`ip\` varchar(45) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`log_student\` DROP COLUMN \`ip\``);
    await queryRunner.query(
      `ALTER TABLE \`log_student\` DROP COLUMN \`device\``,
    );
    await queryRunner.query(`ALTER TABLE \`log_student\` DROP COLUMN \`os\``);
    await queryRunner.query(
      `ALTER TABLE \`log_student\` DROP COLUMN \`browser\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_student\` DROP COLUMN \`user_agent\``,
    );
  }
}
