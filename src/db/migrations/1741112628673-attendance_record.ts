import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceRecord1741112628673 implements MigrationInterface {
  name = 'AttendanceRecord1741112628673';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`absence_justification\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`justification\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`attendance_record\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`registeredAt\` datetime NOT NULL, \`classId\` varchar(36) NULL, \`registeredById\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`student_attendance\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`present\` tinyint(1) NOT NULL, \`studentCourseId\` varchar(36) NULL, \`attendanceRecordId\` varchar(36) NULL, UNIQUE INDEX \`IDX_2d5ea3fa66a07b9e95a86563e1\` (\`attendanceRecordId\`, \`studentCourseId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` ADD CONSTRAINT \`FK_120988e6adf02eb67c14330eb57\` FOREIGN KEY (\`classId\`) REFERENCES \`classes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` ADD CONSTRAINT \`FK_162fb439ab486530e6dd91a8ecd\` FOREIGN KEY (\`registeredById\`) REFERENCES \`collaborators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD CONSTRAINT \`FK_34b8c437c99620c76b6e7ff2acc\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD CONSTRAINT \`FK_36b3a2ea4dfeec41cce222d6f9b\` FOREIGN KEY (\`attendanceRecordId\`) REFERENCES \`attendance_record\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP FOREIGN KEY \`FK_36b3a2ea4dfeec41cce222d6f9b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP FOREIGN KEY \`FK_34b8c437c99620c76b6e7ff2acc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` DROP FOREIGN KEY \`FK_162fb439ab486530e6dd91a8ecd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendance_record\` DROP FOREIGN KEY \`FK_120988e6adf02eb67c14330eb57\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_2d5ea3fa66a07b9e95a86563e1\` ON \`student_attendance\``,
    );
    await queryRunner.query(`DROP TABLE \`student_attendance\``);
    await queryRunner.query(`DROP TABLE \`attendance_record\``);
    await queryRunner.query(`DROP TABLE \`absence_justification\``);
  }
}
