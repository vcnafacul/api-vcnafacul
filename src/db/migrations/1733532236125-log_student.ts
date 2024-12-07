import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogStudent1733532236125 implements MigrationInterface {
  name = 'LogStudent1733532236125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`log_student\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`student_id\` varchar(255) NOT NULL, \`applicationStatus\` varchar(255) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`logsId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_475035f6e7f21cfd8f466deb93a\` FOREIGN KEY (\`logsId\`) REFERENCES \`log_student\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_475035f6e7f21cfd8f466deb93a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`logsId\``,
    );
    await queryRunner.query(`DROP TABLE \`log_student\``);
  }
}
