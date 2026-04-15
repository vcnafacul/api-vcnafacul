import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceRecordPeriod1776000000000 implements MigrationInterface {
  name = 'AttendanceRecordPeriod1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column with default NOITE so existing rows are backfilled, then drop default
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` ADD \`period\` enum('MANHA','TARDE','NOITE') NOT NULL DEFAULT 'NOITE'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` ALTER COLUMN \`period\` DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` DROP COLUMN \`period\``,
    );
  }
}
