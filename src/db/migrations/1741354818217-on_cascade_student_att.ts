import { MigrationInterface, QueryRunner } from 'typeorm';

export class OnCascadeStudentAtt1741354818217 implements MigrationInterface {
  name = 'OnCascadeStudentAtt1741354818217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` DROP FOREIGN KEY \`FK_f02859c175d3a89cc585a2ef694\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP FOREIGN KEY \`FK_36b3a2ea4dfeec41cce222d6f9b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` ADD CONSTRAINT \`FK_f02859c175d3a89cc585a2ef694\` FOREIGN KEY (\`studentAttendanceId\`) REFERENCES \`student_attendance\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD CONSTRAINT \`FK_36b3a2ea4dfeec41cce222d6f9b\` FOREIGN KEY (\`attendanceRecordId\`) REFERENCES \`attendance_record\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP FOREIGN KEY \`FK_36b3a2ea4dfeec41cce222d6f9b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` DROP FOREIGN KEY \`FK_f02859c175d3a89cc585a2ef694\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD CONSTRAINT \`FK_36b3a2ea4dfeec41cce222d6f9b\` FOREIGN KEY (\`attendanceRecordId\`) REFERENCES \`attendance_record\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`absence_justification\` ADD CONSTRAINT \`FK_f02859c175d3a89cc585a2ef694\` FOREIGN KEY (\`studentAttendanceId\`) REFERENCES \`student_attendance\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
